import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import WebSocket from "ws";

type PageRecord = {
  pageNumber: number;
  rawText: string;
  cleanedText: string;
};

type ChapterSpec = {
  chapterNumber: number | null;
  title: string;
  sectionType: "lesson" | "appendix";
  cefrLevel: string;
  skillFocus: string[];
};

type ChapterRecord = ChapterSpec & {
  orderIndex: number;
  startPage: number;
  endPage: number;
};

const BOOK_TITLE = "Complete French All-in-One";
const DEFAULT_PDF_PATHS = [
  "data/Complete French All-in-One.pdf",
  "scripts/import-data/Complete French All-in-One.pdf",
  "C:/Users/dhruv/Downloads/Complete French All-in-One .pdf",
];

const CHAPTER_SPECS: ChapterSpec[] = [
  { chapterNumber: 1, title: "Articles", sectionType: "lesson", cefrLevel: "A2", skillFocus: ["grammar"] },
  { chapterNumber: 2, title: "Basic gender endings: Masculin and féminin", sectionType: "lesson", cefrLevel: "A2", skillFocus: ["grammar", "vocabulary"] },
  { chapterNumber: 3, title: "More French nouns and their gender", sectionType: "lesson", cefrLevel: "A2", skillFocus: ["grammar", "vocabulary"] },
  { chapterNumber: 4, title: "Numbers", sectionType: "lesson", cefrLevel: "A2", skillFocus: ["vocabulary", "listening"] },
  { chapterNumber: 5, title: "Vocabulary: Thoughts, feelings, communicating, home, travel, science, leisure, and technology", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["vocabulary"] },
  { chapterNumber: 6, title: "Building sentences", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "writing"] },
  { chapterNumber: 7, title: "Asking questions", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "speaking"] },
  { chapterNumber: 8, title: "Exclamations and commands", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "speaking"] },
  { chapterNumber: 9, title: "Independent clauses and subordinate clauses", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "reading"] },
  { chapterNumber: 10, title: "The present tense of -er verbs", sectionType: "lesson", cefrLevel: "A2", skillFocus: ["grammar"] },
  { chapterNumber: 11, title: "The present of -ir and -re verbs", sectionType: "lesson", cefrLevel: "A2", skillFocus: ["grammar"] },
  { chapterNumber: 12, title: "Être, avoir, and other irregular verbs", sectionType: "lesson", cefrLevel: "A2", skillFocus: ["grammar"] },
  { chapterNumber: 13, title: "Immediate future, immediate past, causative form", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "speaking"] },
  { chapterNumber: 14, title: "Pronominal verbs", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar"] },
  { chapterNumber: 15, title: "Passé composé", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "writing"] },
  { chapterNumber: 16, title: "Imparfait and plus-que-parfait", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "writing"] },
  { chapterNumber: 17, title: "Simple future and past future", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar"] },
  { chapterNumber: 18, title: "Present conditional and past conditional", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["grammar", "writing"] },
  { chapterNumber: 19, title: "Could, should, would", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["grammar", "speaking"] },
  { chapterNumber: 20, title: "Present subjunctive and past subjunctive", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["grammar", "writing"] },
  { chapterNumber: 21, title: "Prepositions", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "vocabulary"] },
  { chapterNumber: 22, title: "Infinitive mood", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar"] },
  { chapterNumber: 23, title: "Imperative mood", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "speaking"] },
  { chapterNumber: 24, title: "Present participle and gerund", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["grammar", "writing"] },
  { chapterNumber: 25, title: "Simple past, passive voice, indirect speech", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["grammar", "reading"] },
  { chapterNumber: 26, title: "Pronouns", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar"] },
  { chapterNumber: 27, title: "Relative pronouns", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["grammar", "writing"] },
  { chapterNumber: 28, title: "Adjectives", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "vocabulary"] },
  { chapterNumber: 29, title: "Adverbs", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["grammar", "vocabulary"] },
  { chapterNumber: 30, title: "Written French: transitions and written correspondence", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["writing", "exam"] },
  { chapterNumber: 31, title: "Verb transfers and confusing verbs", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["grammar", "vocabulary"] },
  { chapterNumber: 32, title: "French oddities and prepositions", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["grammar", "vocabulary"] },
  { chapterNumber: 33, title: "French in conversation: meeting people", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["speaking", "listening"] },
  { chapterNumber: 34, title: "French in conversation: making conversation and making plans", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["speaking", "listening"] },
  { chapterNumber: 35, title: "French in conversation: discussing current events", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["speaking", "listening"] },
  { chapterNumber: 36, title: "French in conversation: asking for help", sectionType: "lesson", cefrLevel: "B1", skillFocus: ["speaking", "listening"] },
  { chapterNumber: 37, title: "A taste of French literature", sectionType: "lesson", cefrLevel: "B2", skillFocus: ["reading", "culture"] },
  { chapterNumber: null, title: "French pronunciation", sectionType: "appendix", cefrLevel: "A2", skillFocus: ["pronunciation", "listening"] },
  { chapterNumber: null, title: "Grammatical terminology for verbs", sectionType: "appendix", cefrLevel: "B1", skillFocus: ["grammar"] },
  { chapterNumber: null, title: "French verb tables", sectionType: "appendix", cefrLevel: "B1", skillFocus: ["grammar"] },
  { chapterNumber: null, title: "French-English / English-French glossary", sectionType: "appendix", cefrLevel: "B1", skillFocus: ["vocabulary"] },
  { chapterNumber: null, title: "Answer key", sectionType: "appendix", cefrLevel: "B1", skillFocus: ["revision"] },
  { chapterNumber: null, title: "Translations", sectionType: "appendix", cefrLevel: "B1", skillFocus: ["translation"] },
];

loadEnvFile(".env.local");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pdfPath = resolvePdfPath(args.file);
  const pdfBuffer = readFileSync(pdfPath);
  const parser = new PDFParse({ data: pdfBuffer });
  const result = await parser.getText();
  await parser.destroy();

  const pages: PageRecord[] = result.pages.map((page) => ({
    pageNumber: page.num,
    rawText: page.text,
    cleanedText: cleanPdfText(page.text),
  }));

  const chapters = detectChapters(pages);
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket },
    },
  );

  const storagePath = await uploadPdfIfBucketExists(supabase, pdfPath, pdfBuffer);
  const bookSource = await getOrCreateBookSource(supabase, {
    fileName: basename(pdfPath),
    totalPages: result.total,
    storagePath,
  });

  const chapterRows = await upsertChapters(supabase, bookSource.id, chapters);
  const chapterIdByPage = buildChapterPageMap(chapterRows);
  await upsertPages(supabase, bookSource.id, pages, chapterIdByPage);
  const chunks = buildChunks(pages, chapterRows);
  await upsertChunks(supabase, bookSource.id, chunks);

  const report = {
    title: BOOK_TITLE,
    pdfPath,
    storagePath,
    totalPages: result.total,
    pagesImported: pages.length,
    chaptersDetected: chapterRows.length,
    chunksCreated: chunks.length,
    lowConfidenceChapters: chapters.filter((chapter) => chapter.startPage === 1).map((chapter) => chapter.title),
    importedAt: new Date().toISOString(),
  };

  const { error: reportError } = await supabase
    .from("book_import_reports")
    .insert({ book_source_id: bookSource.id, report_json: report });

  if (reportError) {
    throw new Error(`Book import succeeded but report insert failed: ${reportError.message}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

function resolvePdfPath(explicitPath?: string) {
  const candidates = explicitPath ? [explicitPath] : DEFAULT_PDF_PATHS;
  const found = candidates
    .map((candidate) => resolve(process.cwd(), candidate))
    .find((candidate) => existsSync(candidate));

  if (!found) {
    throw new Error(
      `Missing PDF file. Pass --file="C:/path/to/Complete French All-in-One .pdf" or place it at data/Complete French All-in-One.pdf.`,
    );
  }

  return found;
}

function cleanPdfText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/-\n(?=\p{Ll})/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function detectChapters(pages: PageRecord[]): ChapterRecord[] {
  const detectedStarts = CHAPTER_SPECS.map((spec, index) => {
    const normalizedTitle = normalizeForSearch(spec.title);
    const compactTitle = normalizedTitle.replace(/[^a-z0-9]+/g, " ").trim();
    const pageMatch = pages.find((page) => {
      if (page.pageNumber <= 4) return false;
      const pageText = normalizeForSearch(page.cleanedText);
      return pageText.includes(normalizedTitle) || pageText.includes(compactTitle);
    });

    return {
      spec,
      orderIndex: index + 1,
      detectedPage: pageMatch?.pageNumber ?? null,
    };
  });

  const totalPages = pages.at(-1)?.pageNumber ?? pages.length;
  const fallbackSpan = Math.max(1, Math.floor(totalPages / CHAPTER_SPECS.length));
  const starts = detectedStarts.map((item, index) => ({
    ...item,
    startPage: item.detectedPage ?? Math.min(totalPages, 1 + index * fallbackSpan),
  }));

  return starts.map((item, index) => {
    const nextStart = starts[index + 1]?.startPage;
    return {
      ...item.spec,
      orderIndex: item.orderIndex,
      startPage: item.startPage,
      endPage: nextStart ? Math.max(item.startPage, nextStart - 1) : totalPages,
    };
  });
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function uploadPdfIfBucketExists(
  supabase: ReturnType<typeof createClient>,
  pdfPath: string,
  pdfBuffer: Buffer,
) {
  const bucket = process.env.SUPABASE_BOOK_SOURCES_BUCKET ?? "book-sources";
  const storagePath = `internal/${BOOK_TITLE.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  const { error } = await supabase.storage.from(bucket).upload(storagePath, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    console.warn(
      `PDF text import will continue, but PDF storage upload failed for bucket "${bucket}": ${error.message}`,
    );
    console.warn(`Local PDF path used: ${pdfPath}`);
    return null;
  }

  return `${bucket}/${storagePath}`;
}

async function getOrCreateBookSource(
  supabase: ReturnType<typeof createClient>,
  input: { fileName: string; totalPages: number; storagePath: string | null },
) {
  const { data: existing, error: existingError } = await supabase
    .from("book_sources")
    .select("*")
    .eq("title", BOOK_TITLE)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Unable to read book source. Apply the book migration first. ${existingError.message}`);
  }

  if (existing) {
    const { data, error } = await supabase
      .from("book_sources")
      .update({
        file_name: input.fileName,
        total_pages: input.totalPages,
        storage_path: input.storagePath,
        source_type: "pdf",
        is_internal: true,
        is_active: true,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(`Unable to update book source: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase
    .from("book_sources")
    .insert({
      title: BOOK_TITLE,
      source_type: "pdf",
      file_name: input.fileName,
      total_pages: input.totalPages,
      storage_path: input.storagePath,
      is_internal: true,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Unable to create book source: ${error.message}`);
  return data;
}

async function upsertChapters(
  supabase: ReturnType<typeof createClient>,
  bookSourceId: string,
  chapters: ChapterRecord[],
) {
  const payload = chapters.map((chapter) => ({
    book_source_id: bookSourceId,
    chapter_number: chapter.chapterNumber,
    title: chapter.title,
    start_page: chapter.startPage,
    end_page: chapter.endPage,
    section_type: chapter.sectionType,
    cefr_level: chapter.cefrLevel,
    skill_focus: chapter.skillFocus,
    order_index: chapter.orderIndex,
  }));

  const { data, error } = await supabase
    .from("book_chapters")
    .upsert(payload, { onConflict: "book_source_id,order_index" })
    .select("*")
    .order("order_index", { ascending: true });

  if (error) throw new Error(`Unable to upsert book chapters: ${error.message}`);
  return data ?? [];
}

function buildChapterPageMap(chapters: Array<{ id: string; start_page: number | null; end_page: number | null }>) {
  return new Map(
    chapters.flatMap((chapter) => {
      const start = chapter.start_page ?? 1;
      const end = chapter.end_page ?? start;
      return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => [
        start + index,
        chapter.id,
      ] as const);
    }),
  );
}

async function upsertPages(
  supabase: ReturnType<typeof createClient>,
  bookSourceId: string,
  pages: PageRecord[],
  chapterIdByPage: Map<number, string>,
) {
  for (const batch of chunkArray(pages, 100)) {
    const { error } = await supabase.from("book_pages").upsert(
      batch.map((page) => ({
        book_source_id: bookSourceId,
        chapter_id: chapterIdByPage.get(page.pageNumber) ?? null,
        page_number: page.pageNumber,
        raw_text: page.rawText,
        cleaned_text: page.cleanedText,
        page_type: page.cleanedText.length < 80 ? "front_matter" : "content",
      })),
      { onConflict: "book_source_id,page_number" },
    );

    if (error) throw new Error(`Unable to upsert book pages: ${error.message}`);
  }
}

function buildChunks(
  pages: PageRecord[],
  chapters: Array<{ id: string; title: string; start_page: number | null; end_page: number | null; section_type: string | null }>,
) {
  const chunks: Array<{
    chapterId: string;
    chunkIndex: number;
    pageStart: number;
    pageEnd: number;
    text: string;
    chunkType: string;
    headings: string[];
  }> = [];

  for (const chapter of chapters) {
    const chapterPages = pages.filter(
      (page) =>
        page.pageNumber >= (chapter.start_page ?? 1) &&
        page.pageNumber <= (chapter.end_page ?? chapter.start_page ?? page.pageNumber),
    );
    let buffer = "";
    let pageStart = chapterPages[0]?.pageNumber ?? chapter.start_page ?? 1;
    let chunkIndex = 1;

    for (const page of chapterPages) {
      if (buffer.length + page.cleanedText.length > 5500 && buffer.trim()) {
        chunks.push({
          chapterId: chapter.id,
          chunkIndex,
          pageStart,
          pageEnd: page.pageNumber - 1,
          text: buffer.trim(),
          chunkType: chapter.section_type ?? "lesson",
          headings: extractHeadings(buffer),
        });
        buffer = "";
        pageStart = page.pageNumber;
        chunkIndex += 1;
      }

      buffer += `\n\n[Page ${page.pageNumber}]\n${page.cleanedText}`;
    }

    if (buffer.trim()) {
      chunks.push({
        chapterId: chapter.id,
        chunkIndex,
        pageStart,
        pageEnd: chapterPages.at(-1)?.pageNumber ?? pageStart,
        text: buffer.trim(),
        chunkType: chapter.section_type ?? "lesson",
        headings: extractHeadings(buffer),
      });
    }
  }

  return chunks;
}

async function upsertChunks(
  supabase: ReturnType<typeof createClient>,
  bookSourceId: string,
  chunks: ReturnType<typeof buildChunks>,
) {
  for (const batch of chunkArray(chunks, 50)) {
    const { error } = await supabase.from("book_chunks").upsert(
      batch.map((chunk) => ({
        book_source_id: bookSourceId,
        chapter_id: chunk.chapterId,
        page_start: chunk.pageStart,
        page_end: chunk.pageEnd,
        chunk_index: chunk.chunkIndex,
        chunk_text: chunk.text,
        chunk_type: chunk.chunkType,
        headings: chunk.headings,
        metadata: { imported_from: "Complete French All-in-One .pdf" },
      })),
      { onConflict: "book_source_id,chapter_id,chunk_index" },
    );

    if (error) throw new Error(`Unable to upsert book chunks: ${error.message}`);
  }
}

function extractHeadings(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 4 && line.length <= 90 && /^[A-ZÀ-Ÿ0-9][^.!?]{3,}$/.test(line))
    .slice(0, 8);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function parseArgs(args: string[]) {
  const parsed: Record<string, string | undefined> = {};
  for (const arg of args) {
    const [key, ...valueParts] = arg.replace(/^--/, "").split("=");
    parsed[key] = valueParts.join("=") || undefined;
  }
  return parsed;
}

function loadEnvFile(fileName: string) {
  const envPath = resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) return;
  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Add it to .env.local or the shell environment.`);
  }
  return value;
}
