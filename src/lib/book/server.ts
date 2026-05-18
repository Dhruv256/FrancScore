import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type {
  BookChapter,
  BookChapterStudy,
  BookGeneratedItem,
  BookNote,
  BookOverview,
  BookPage,
  BookSearchResult,
  BookSource,
  UserBookProgress,
} from "@/lib/book/types";

// The book tables are additive and may not exist in generated Supabase types until
// the linked project regenerates types, so this data layer intentionally uses an
// untyped Supabase client boundary for the new module only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabase = SupabaseClient<any>;

export async function getBookOverview(userId: string): Promise<BookOverview> {
  const supabase = (await createClient()) as unknown as UntypedSupabase;
  const source = await getActiveBookSourceOrNull(supabase);
  if (!source) {
    return {
      source: null,
      chapters: [],
      stats: {
        chaptersTotal: 0,
        chaptersCompleted: 0,
        pagesTotal: 0,
        notesGenerated: 0,
        generatedItems: 0,
        flashcards: 0,
        quizItems: 0,
      },
    };
  }

  const chapters = await getChaptersForSource(supabase, source.id, userId);
  const [notesGenerated, generatedItems, flashcards, quizItems] = await Promise.all([
    countRows(supabase, "book_notes", { book_source_id: source.id }),
    countRows(supabase, "book_generated_items", { book_source_id: source.id }),
    countRows(supabase, "book_generated_items", { book_source_id: source.id, item_type: "flashcard" }),
    countRows(supabase, "book_generated_items", { book_source_id: source.id, item_type: "mcq" }),
  ]);

  return {
    source,
    chapters,
    stats: {
      chaptersTotal: chapters.length,
      chaptersCompleted: chapters.filter(
        (chapter) => chapter.progress?.status === "completed" || chapter.progress?.completion_percent === 100,
      ).length,
      pagesTotal: source.total_pages ?? 0,
      notesGenerated,
      generatedItems,
      flashcards,
      quizItems,
    },
  };
}

export async function getBookChapters(userId: string) {
  const overview = await getBookOverview(userId);
  return overview;
}

export async function getBookChapterStudy(
  chapterId: string,
  userId: string,
): Promise<BookChapterStudy | null> {
  const supabase = (await createClient()) as unknown as UntypedSupabase;
  const { data: chapter, error: chapterError } = await supabase
    .from("book_chapters")
    .select("*")
    .eq("id", chapterId)
    .maybeSingle();

  if (chapterError) {
    throw new Error(`Unable to load book chapter. ${chapterError.message}`);
  }
  if (!chapter) return null;

  const source = await getActiveBookSource(supabase, chapter.book_source_id);
  if (!source) return null;

  const [pagesResult, notesResult, itemsResult, progressResult, counts] = await Promise.all([
    supabase
      .from("book_pages")
      .select("id,page_number,cleaned_text,raw_text")
      .eq("chapter_id", chapterId)
      .order("page_number", { ascending: true })
      .limit(12),
    supabase
      .from("book_notes")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("note_type", { ascending: true }),
    supabase
      .from("book_generated_items")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: true })
      .limit(80),
    supabase
      .from("user_book_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("chapter_id", chapterId)
      .maybeSingle(),
    getChapterCounts(supabase, chapterId),
  ]);

  if (pagesResult.error) throw new Error(`Unable to load chapter pages. ${pagesResult.error.message}`);
  if (notesResult.error) throw new Error(`Unable to load chapter notes. ${notesResult.error.message}`);
  if (itemsResult.error) throw new Error(`Unable to load chapter items. ${itemsResult.error.message}`);
  if (progressResult.error) throw new Error(`Unable to load chapter progress. ${progressResult.error.message}`);

  return {
    source,
    chapter: {
      ...(chapter as BookChapter),
      progress: (progressResult.data as UserBookProgress | null) ?? null,
      counts,
    },
    pages: (pagesResult.data ?? []) as BookPage[],
    notes: (notesResult.data ?? []) as BookNote[],
    generatedItems: (itemsResult.data ?? []) as BookGeneratedItem[],
  };
}

export async function searchBook(query: string): Promise<BookSearchResult[]> {
  const supabase = (await createClient()) as unknown as UntypedSupabase;
  const source = await getActiveBookSourceOrNull(supabase);
  if (!source || !query.trim()) return [];

  const { data, error } = await supabase
    .from("book_chunks")
    .select("id,chapter_id,page_start,page_end,chunk_text,book_chapters(title)")
    .eq("book_source_id", source.id)
    .ilike("chunk_text", `%${query.trim()}%`)
    .limit(30);

  if (error) throw new Error(`Unable to search book content. ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    chapter_id: row.chapter_id,
    chapter_title: extractJoinedTitle(row.book_chapters),
    page_start: row.page_start,
    page_end: row.page_end,
    snippet: makeSnippet(row.chunk_text, query),
  }));
}

export async function getBookAdminStatus() {
  const supabase = (await createClient()) as unknown as UntypedSupabase;
  const source = await getActiveBookSourceOrNull(supabase);
  if (!source) {
    return {
      source: null,
      chapters: 0,
      pages: 0,
      chunks: 0,
      notes: 0,
      generatedItems: 0,
      listeningScriptsMissingAudio: 0,
      latestReport: null,
    };
  }

  const [chapters, pages, chunks, notes, generatedItems, listeningScripts, report] = await Promise.all([
    countRows(supabase, "book_chapters", { book_source_id: source.id }),
    countRows(supabase, "book_pages", { book_source_id: source.id }),
    countRows(supabase, "book_chunks", { book_source_id: source.id }),
    countRows(supabase, "book_notes", { book_source_id: source.id }),
    countRows(supabase, "book_generated_items", { book_source_id: source.id }),
    supabase
      .from("book_generated_items")
      .select("id,item_json")
      .eq("book_source_id", source.id)
      .eq("item_type", "listening_script"),
    supabase
      .from("book_import_reports")
      .select("*")
      .eq("book_source_id", source.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    source,
    chapters,
    pages,
    chunks,
    notes,
    generatedItems,
    listeningScriptsMissingAudio: (listeningScripts.data ?? []).filter(
      (item) => !getJsonObject(item.item_json).audio_url,
    ).length,
    latestReport: report.data ?? null,
  };
}

async function getActiveBookSource(supabase: UntypedSupabase, sourceId?: string): Promise<BookSource | null> {
  let query = supabase
    .from("book_sources")
    .select("*")
    .eq("is_active", true)
    .eq("is_internal", true);

  query = sourceId
    ? query.eq("id", sourceId)
    : query.order("created_at", { ascending: false }).limit(1);
  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Unable to load French All-in-One book source. ${error.message}`);
  }

  return (data as BookSource | null) ?? null;
}

async function getActiveBookSourceOrNull(supabase: UntypedSupabase, sourceId?: string) {
  try {
    return await getActiveBookSource(supabase, sourceId);
  } catch {
    return null;
  }
}

async function getChaptersForSource(
  supabase: UntypedSupabase,
  sourceId: string,
  userId: string,
): Promise<BookChapter[]> {
  const [chaptersResult, progressResult] = await Promise.all([
    supabase
      .from("book_chapters")
      .select("*")
      .eq("book_source_id", sourceId)
      .order("order_index", { ascending: true }),
    supabase
      .from("user_book_progress")
      .select("*")
      .eq("book_source_id", sourceId)
      .eq("user_id", userId),
  ]);

  if (chaptersResult.error) throw new Error(`Unable to load book chapters. ${chaptersResult.error.message}`);
  if (progressResult.error) throw new Error(`Unable to load book progress. ${progressResult.error.message}`);

  const progressByChapter = new Map(
    ((progressResult.data ?? []) as UserBookProgress[]).map((progress) => [
      progress.chapter_id,
      progress,
    ]),
  );

  return Promise.all(
    ((chaptersResult.data ?? []) as BookChapter[]).map(async (chapter) => ({
      ...chapter,
      progress: progressByChapter.get(chapter.id) ?? null,
      counts: await getChapterCounts(supabase, chapter.id),
    })),
  );
}

async function getChapterCounts(supabase: UntypedSupabase, chapterId: string) {
  const [notes, generatedItems, flashcards, quizItems] = await Promise.all([
    countRows(supabase, "book_notes", { chapter_id: chapterId }),
    countRows(supabase, "book_generated_items", { chapter_id: chapterId }),
    countRows(supabase, "book_generated_items", { chapter_id: chapterId, item_type: "flashcard" }),
    countRows(supabase, "book_generated_items", { chapter_id: chapterId, item_type: "mcq" }),
  ]);

  return { notes, generatedItems, flashcards, quizItems };
}

async function countRows(
  supabase: UntypedSupabase,
  table: string,
  filters: Record<string, string | number | boolean | null>,
) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

function makeSnippet(text: string, query: string) {
  const normalized = text.replace(/\s+/g, " ");
  const index = normalized.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return `${normalized.slice(0, 260)}...`;
  const start = Math.max(0, index - 110);
  return `${start > 0 ? "..." : ""}${normalized.slice(start, index + 190)}...`;
}

function extractJoinedTitle(joined: unknown) {
  if (Array.isArray(joined)) {
    return getJsonObject(joined[0]).title as string | null;
  }
  return getJsonObject(joined).title as string | null;
}

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
