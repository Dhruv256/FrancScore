import { NextResponse } from "next/server";
import { z } from "zod";
import { processPdfChunkWithAi } from "@/lib/ai/process-pdf-chunk";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { getServerEnv } from "@/lib/env/server";
import { isPdfBookFeatureEnabled, pdfBookFeatureDisabledJson } from "@/lib/features/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingDatabaseMigrationError } from "@/lib/supabase/schema-errors";

const generateSchema = z.object({
  chapterId: z.string().uuid().optional(),
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!isPdfBookFeatureEnabled()) {
    return pdfBookFeatureDisabledJson();
  }

  try {
    await requireAdmin();
    const env = getServerEnv();
    if (!env.NVIDIA_MAIN_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          code: "NVIDIA_MAIN_API_KEY_MISSING",
          message: "NVIDIA_MAIN_API_KEY is missing on the server.",
        },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "INVALID_PAYLOAD", message: parsed.error.issues[0]?.message ?? "Invalid payload." },
        { status: 400 },
      );
    }

    const result = await generateChapterMaterial({
      chapterId: parsed.data.chapterId,
      all: parsed.data.all ?? false,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    if (isMissingDatabaseMigrationError(error)) {
      return NextResponse.json(
        { ok: false, code: "DATABASE_MIGRATION_MISSING", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "BOOK_MATERIAL_GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Unable to generate book material.",
      },
      { status: 500 },
    );
  }
}

async function generateChapterMaterial(input: { chapterId?: string; all: boolean }) {
  // Book tables are additive and not yet in generated Supabase types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  let chapterQuery = supabase
    .from("book_chapters")
    .select("*")
    .order("order_index", { ascending: true })
    .limit(input.all ? 1 : 1);

  if (input.chapterId) {
    chapterQuery = chapterQuery.eq("id", input.chapterId);
  }

  const { data: chapters, error: chapterError } = await chapterQuery;
  if (chapterError) throw new Error(chapterError.message);
  const chapter = chapters?.[0];
  if (!chapter) {
    throw new Error("No imported book chapter was found.");
  }

  const { data: chunks, error: chunkError } = await supabase
    .from("book_chunks")
    .select("*")
    .eq("chapter_id", chapter.id)
    .order("chunk_index", { ascending: true })
    .limit(3);

  if (chunkError) throw new Error(chunkError.message);
  if (!chunks?.length) throw new Error("No chunks exist for this chapter.");

  const generatedItems: Array<Record<string, unknown>> = [];
  const summaryLines: string[] = [];

  for (const chunk of chunks) {
    const { result, modelUsed } = await processPdfChunkWithAi({
      rawText: chunk.chunk_text,
      pageStart: chunk.page_start,
      pageEnd: chunk.page_end,
    });
    summaryLines.push(
      ...result.items
        .map((item) => item.summary || item.title || item.content)
        .filter(Boolean)
        .slice(0, 6),
    );
    generatedItems.push(
      ...flattenBookGeneratedItems({
        items: result.items,
        bookSourceId: chapter.book_source_id,
        chapterId: chapter.id,
        sourceChunkId: chunk.id,
        cefrLevel: chapter.cefr_level ?? "B1",
        modelUsed,
      }),
    );
  }

  const summary = summaryLines.slice(0, 12);
  await supabase.from("book_notes").upsert(
    [
      {
        book_source_id: chapter.book_source_id,
        chapter_id: chapter.id,
        note_type: "chapter_summary",
        title: `Chapter summary: ${chapter.title}`,
        content_md: [`# ${chapter.title}`, "", ...summary.map((line) => `- ${line}`)].join("\n"),
        key_points: summary,
        examples: [],
        cefr_level: chapter.cefr_level ?? "B1",
      },
      {
        book_source_id: chapter.book_source_id,
        chapter_id: chapter.id,
        note_type: "exam_application",
        title: `TEF/TCF application: ${chapter.title}`,
        content_md:
          "Use this chapter for active recall: summarize the rule, produce original examples, and convert examples into TEF/TCF-style reading, writing, speaking, and listening tasks.",
        key_points: ["active recall", "exam transfer", "B1/B2 accuracy"],
        examples: [],
        cefr_level: chapter.cefr_level ?? "B1",
      },
    ],
    { onConflict: "chapter_id,note_type" },
  );

  if (generatedItems.length) {
    const { error: itemError } = await supabase.from("book_generated_items").insert(generatedItems);
    if (itemError) throw new Error(itemError.message);
  }

  return {
    chapter_id: chapter.id,
    chapter_title: chapter.title,
    notes_generated: 2,
    generated_items_created: generatedItems.length,
  };
}

function flattenBookGeneratedItems(input: {
  items: Array<{
    item_type: string;
    title: string;
    summary: string;
    content: string;
    french_text: string;
    english_explanation: string;
    cefr_level: string;
    tags: string[];
    flashcards: Array<Record<string, unknown>>;
    questions: Array<Record<string, unknown>>;
  }>;
  bookSourceId: string;
  chapterId: string;
  sourceChunkId: string;
  cefrLevel: string;
  modelUsed: string;
}) {
  const rows: Array<Record<string, unknown>> = [];
  for (const item of input.items) {
    for (const flashcard of item.flashcards ?? []) {
      if (!flashcard.french_word) continue;
      rows.push(baseGeneratedItem(input, "flashcard", flashcard, item.tags));
    }
    for (const question of item.questions ?? []) {
      rows.push(baseGeneratedItem(input, question.question_type === "mcq" ? "mcq" : "revision_question", question, item.tags));
    }
    if (["grammar_concept", "study_note", "writing_prompt", "speaking_prompt", "reading_passage"].includes(item.item_type)) {
      rows.push(
        baseGeneratedItem(
          input,
          item.item_type === "study_note" ? "summary_card" : item.item_type,
          {
            title: item.title,
            summary: item.summary,
            content: item.content,
            french_text: item.french_text,
            english_explanation: item.english_explanation,
            model_used: input.modelUsed,
          },
          item.tags,
        ),
      );
    }
  }
  return rows;
}

function baseGeneratedItem(
  input: {
    bookSourceId: string;
    chapterId: string;
    sourceChunkId: string;
    cefrLevel: string;
  },
  itemType: string,
  itemJson: Record<string, unknown>,
  tags: string[] = [],
) {
  return {
    book_source_id: input.bookSourceId,
    chapter_id: input.chapterId,
    source_chunk_id: input.sourceChunkId,
    item_type: itemType,
    item_json: itemJson,
    difficulty: "medium",
    cefr_level: input.cefrLevel,
    tags: [...new Set(["book", "ai-generated", ...tags].map((tag) => tag.toLowerCase()))],
  };
}
