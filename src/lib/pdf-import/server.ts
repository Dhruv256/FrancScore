import "server-only";

import { PDFParse } from "pdf-parse";
import { processPdfChunkWithAi, type PdfChunkAiItem } from "@/lib/ai/process-pdf-chunk";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  MissingDatabaseMigrationError,
  toMissingMigrationError,
} from "@/lib/supabase/schema-errors";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;
type PdfItemRow = Database["public"]["Tables"]["pdf_import_items"]["Row"];

export async function listPdfImportBatches() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pdf_import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throwPdfImportError(error, "pdf_import_batches", "Unable to load PDF import batches.");
  return data ?? [];
}

export async function safeListPdfImportBatches() {
  try {
    return {
      batches: await listPdfImportBatches(),
      error: null as string | null,
    };
  } catch (error) {
    if (error instanceof MissingDatabaseMigrationError) {
      return {
        batches: [],
        error: error.message,
      };
    }

    return {
      batches: [],
      error: error instanceof Error ? error.message : "Unable to load PDF import batches.",
    };
  }
}

export async function getPdfImportBatchDetail(batchId: string) {
  const supabase = createAdminClient();
  const [batchResult, chunksResult, itemsResult] = await Promise.all([
    supabase.from("pdf_import_batches").select("*").eq("id", batchId).single(),
    supabase.from("pdf_import_chunks").select("*").eq("batch_id", batchId).order("chunk_index"),
    supabase.from("pdf_import_items").select("*").eq("batch_id", batchId).order("created_at"),
  ]);

  if (batchResult.error) {
    throwPdfImportError(batchResult.error, "pdf_import_batches", "PDF import batch not found.");
  }
  if (chunksResult.error) {
    throwPdfImportError(chunksResult.error, "pdf_import_chunks", "Unable to load PDF import chunks.");
  }
  if (itemsResult.error) {
    throwPdfImportError(itemsResult.error, "pdf_import_items", "Unable to load PDF import items.");
  }

  return {
    batch: batchResult.data,
    chunks: chunksResult.data ?? [],
    items: itemsResult.data ?? [],
  };
}

export async function createPdfImportBatch(input: {
  userId: string;
  file: File;
}) {
  const env = getServerEnv();

  if (input.file.type !== "application/pdf" && !input.file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please upload a PDF file.");
  }

  const supabase = createAdminClient();
  const batchId = crypto.randomUUID();
  const safeFileName = input.file.name.replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-");
  const storagePath = `${batchId}/${safeFileName || "import.pdf"}`;

  await createBatch(supabase, {
    id: batchId,
    uploaded_by: input.userId,
    file_name: input.file.name,
    storage_path: storagePath,
    status: "pending",
  });

  try {
    await updateBatch(supabase, batchId, { status: "extracting" });
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_PDF_IMPORTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { pages, totalPages } = await extractPdfPages(buffer);
    if (totalPages > env.PDF_MAX_PAGES_PER_UPLOAD) {
      throw new Error(
        `PDF has ${totalPages} pages. The current limit is ${env.PDF_MAX_PAGES_PER_UPLOAD} pages per upload.`,
      );
    }

    await updateBatch(supabase, batchId, { status: "chunking", total_pages: totalPages });
    const chunks = chunkPdfPages(pages, env.PDF_CHUNK_SIZE, env.PDF_CHUNK_OVERLAP);

    if (!chunks.length) {
      throw new Error("No extractable text was found in this PDF.");
    }

    const { error: chunkError } = await supabase.from("pdf_import_chunks").insert(
      chunks.map((chunk) => ({
        batch_id: batchId,
        chunk_index: chunk.chunkIndex,
        page_start: chunk.pageStart,
        page_end: chunk.pageEnd,
        raw_text: chunk.rawText,
        ai_status: "pending",
      })),
    );

    if (chunkError) throw new Error(chunkError.message);

    await updateBatch(supabase, batchId, {
      status: "ready_for_review",
      total_chunks: chunks.length,
      completed_at: new Date().toISOString(),
    });

    return batchId;
  } catch (error) {
    await updateBatch(supabase, batchId, {
      status: "failed",
      error_message: error instanceof Error ? error.message : "PDF import failed.",
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}

export async function processNextPdfImportChunk(batchId: string, chunkId?: string) {
  const supabase = createAdminClient();
  const { data: batch, error: batchError } = await supabase
    .from("pdf_import_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    throwPdfImportError(batchError, "pdf_import_batches", "PDF import batch not found.");
  }

  await updateBatch(supabase, batchId, { status: "processing", error_message: null });

  const chunk = await getProcessableChunk(supabase, batchId, chunkId);
  if (!chunk) {
    await updateBatch(supabase, batchId, {
      status: "ready_for_review",
      completed_at: new Date().toISOString(),
    });
    return { processed: false, message: "No pending or failed chunks remain." };
  }

  try {
    await supabase.from("pdf_import_chunks").update({ ai_status: "processing" }).eq("id", chunk.id);
    const { modelUsed, result } = await processPdfChunkWithAi({
      rawText: chunk.raw_text,
      pageStart: chunk.page_start,
      pageEnd: chunk.page_end,
    });

    await supabase
      .from("pdf_import_chunks")
      .update({
        ai_status: "completed",
        ai_result_json: result as unknown as Json,
        processed_at: new Date().toISOString(),
      })
      .eq("id", chunk.id);

    const rows = result.items.map((item) => mapAiItemToImportRow(batchId, chunk.id, item));
    if (rows.length) {
      const { error: itemError } = await supabase.from("pdf_import_items").insert(rows);
      if (itemError) throw new Error(itemError.message);
    }

    const remaining = await countRemainingChunks(supabase, batchId);
    await updateBatch(supabase, batchId, {
      status: remaining === 0 ? "ready_for_review" : "processing",
      model_used: modelUsed,
      completed_at: remaining === 0 ? new Date().toISOString() : null,
    });

    return {
      processed: true,
      chunkIndex: chunk.chunk_index,
      itemCount: rows.length,
      remaining,
      modelUsed,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chunk AI processing failed.";
    await supabase
      .from("pdf_import_chunks")
      .update({
        ai_status: "failed",
        ai_result_json: { error: message } as Json,
        processed_at: new Date().toISOString(),
      })
      .eq("id", chunk.id);
    await updateBatch(supabase, batchId, { status: "failed", error_message: message });
    throw error;
  }
}

export async function setPdfImportItemStatus(input: {
  itemId: string;
  status: "approved" | "rejected" | "pending_review";
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pdf_import_items")
    .update({ status: input.status })
    .eq("id", input.itemId);

  if (error) throwPdfImportError(error, "pdf_import_items", "Unable to update PDF import item.");
}

export async function updatePdfImportItem(input: {
  itemId: string;
  title: string;
  contentJson: Json;
  confidence: number;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pdf_import_items")
    .update({
      title: input.title,
      content_json: input.contentJson,
      confidence: input.confidence,
    })
    .eq("id", input.itemId);

  if (error) throwPdfImportError(error, "pdf_import_items", "Unable to update PDF import item.");
}

export async function approveHighConfidencePdfImportItems(batchId: string, minimumConfidence = 0.82) {
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("pdf_import_items")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("status", "pending_review")
    .gte("confidence", minimumConfidence)
    .neq("item_type", "invalid");

  if (countError) {
    throwPdfImportError(countError, "pdf_import_items", "Unable to count PDF import items.");
  }

  const { error } = await supabase
    .from("pdf_import_items")
    .update({ status: "approved" })
    .eq("batch_id", batchId)
    .eq("status", "pending_review")
    .gte("confidence", minimumConfidence)
    .neq("item_type", "invalid");

  if (error) throwPdfImportError(error, "pdf_import_items", "Unable to approve PDF import items.");
  return count ?? 0;
}

export async function retryFailedPdfImportChunks(batchId: string) {
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("pdf_import_chunks")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("ai_status", "failed");

  if (countError) {
    throwPdfImportError(countError, "pdf_import_chunks", "Unable to count failed PDF chunks.");
  }

  const { error } = await supabase
    .from("pdf_import_chunks")
    .update({ ai_status: "pending", error_message: null })
    .eq("batch_id", batchId)
    .eq("ai_status", "failed");

  if (error) {
    throwPdfImportError(error, "pdf_import_chunks", "Unable to retry failed PDF chunks.");
  }

  await updateBatch(supabase, batchId, {
    status: "processing",
    error_message: null,
    completed_at: null,
  });

  return { resetCount: count ?? 0 };
}

export async function importApprovedPdfItems(batchId: string) {
  const supabase = createAdminClient();
  const { data: items, error } = await supabase
    .from("pdf_import_items")
    .select("*")
    .eq("batch_id", batchId)
    .eq("status", "approved");

  if (error) throwPdfImportError(error, "pdf_import_items", "Unable to load approved PDF import items.");

  const counts = {
    vocabulary: 0,
    concepts: 0,
    passages: 0,
    writingPrompts: 0,
    speakingPrompts: 0,
    exercises: 0,
  };

  for (const item of items ?? []) {
    await importPdfItem(supabase, batchId, item, counts);
    await supabase.from("pdf_import_items").update({ status: "imported" }).eq("id", item.id);
  }

  await updateBatch(supabase, batchId, {
    status: "imported",
    completed_at: new Date().toISOString(),
  });

  return counts;
}

async function extractPdfPages(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      totalPages: result.total,
      pages: result.pages.map((page) => ({
        pageNumber: page.num,
        text: cleanPdfText(page.text),
      })),
    };
  } finally {
    await parser.destroy();
  }
}

function chunkPdfPages(
  pages: Array<{ pageNumber: number; text: string }>,
  chunkSize: number,
  overlap: number,
) {
  const chunks: Array<{
    chunkIndex: number;
    pageStart: number;
    pageEnd: number;
    rawText: string;
  }> = [];
  let current = "";
  let pageStart: number | null = null;
  let pageEnd: number | null = null;

  for (const page of pages) {
    if (!page.text.trim()) continue;
    const pageBlock = `\n\n[Page ${page.pageNumber}]\n${page.text}`;

    if (current && current.length + pageBlock.length > chunkSize) {
      chunks.push({
        chunkIndex: chunks.length,
        pageStart: pageStart ?? page.pageNumber,
        pageEnd: pageEnd ?? page.pageNumber,
        rawText: current.trim(),
      });
      current = current.slice(Math.max(0, current.length - overlap));
      pageStart = pageEnd ?? page.pageNumber;
    }

    if (!pageStart) pageStart = page.pageNumber;
    pageEnd = page.pageNumber;
    current += pageBlock;
  }

  if (current.trim()) {
    chunks.push({
      chunkIndex: chunks.length,
      pageStart: pageStart ?? 1,
      pageEnd: pageEnd ?? pageStart ?? 1,
      rawText: current.trim(),
    });
  }

  return chunks;
}

function mapAiItemToImportRow(batchId: string, chunkId: string, item: PdfChunkAiItem) {
  return {
    batch_id: batchId,
    chunk_id: chunkId,
    item_type: item.item_type,
    title: item.title || item.summary || item.item_type,
    content_json: item as unknown as Json,
    suggested_destination: getSuggestedDestination(item.item_type),
    confidence: item.confidence,
    status: item.item_type === "invalid" ? "rejected" : "pending_review",
  };
}

async function getProcessableChunk(
  supabase: SupabaseAdmin,
  batchId: string,
  chunkId?: string,
) {
  let query = supabase
    .from("pdf_import_chunks")
    .select("*")
    .eq("batch_id", batchId)
    .in("ai_status", ["pending", "failed"])
    .order("chunk_index")
    .limit(1);

  if (chunkId) {
    query = query.eq("id", chunkId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throwPdfImportError(error, "pdf_import_chunks", "Unable to load PDF import chunk.");
  return data;
}

async function countRemainingChunks(supabase: SupabaseAdmin, batchId: string) {
  const { count, error } = await supabase
    .from("pdf_import_chunks")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .in("ai_status", ["pending", "failed"]);

  if (error) throwPdfImportError(error, "pdf_import_chunks", "Unable to count PDF import chunks.");
  return count ?? 0;
}

async function importPdfItem(
  supabase: SupabaseAdmin,
  batchId: string,
  item: PdfItemRow,
  counts: {
    vocabulary: number;
    concepts: number;
    passages: number;
    writingPrompts: number;
    speakingPrompts: number;
    exercises: number;
  },
) {
  const content = item.content_json as Record<string, unknown>;
  const itemType = String(content.item_type ?? item.item_type);

  if (["vocabulary", "phrase", "connector"].includes(itemType)) {
    const flashcards = Array.isArray(content.flashcards) ? content.flashcards : [];
    for (const flashcard of flashcards) {
      if (!isRecord(flashcard) || !flashcard.french_word || !flashcard.english_meaning) continue;
      await supabase.from("vocabulary").insert({
        french_word: String(flashcard.french_word),
        english_meaning: String(flashcard.english_meaning),
        french_example: String(flashcard.french_example ?? ""),
        english_example_translation: String(flashcard.english_example_translation ?? ""),
        cefr_level: normalizeCefr(content.cefr_level),
        topic: normalizeTopic(content.topic),
        exam_type: normalizeExam(content.exam_type),
        tags: normalizeTags([...(Array.isArray(content.tags) ? content.tags : []), ...(Array.isArray(flashcard.tags) ? flashcard.tags : [])]),
        is_published: true,
      });
      counts.vocabulary += 1;
    }
    return;
  }

  if (itemType === "grammar_concept") {
    await supabase.from("concepts").insert({
      title: item.title ?? String(content.title ?? "Grammar concept"),
      description: String(content.summary ?? content.content ?? ""),
      french_example: String(content.french_text ?? ""),
      english_explanation: String(content.english_explanation ?? ""),
      level: normalizeCefr(content.cefr_level),
      topic: normalizeTopic(content.topic),
      exam_type: normalizeExam(content.exam_type),
      tags: normalizeTags(content.tags),
      is_published: true,
    });
    counts.concepts += 1;
    return;
  }

  if (itemType === "reading_passage") {
    const { data: passage } = await supabase
      .from("passages")
      .insert({
        title: item.title ?? String(content.title ?? "Imported reading passage"),
        content: String(content.french_text ?? content.content ?? ""),
        type: "reading",
        exam_type: normalizeExam(content.exam_type),
        cefr_level: normalizeCefr(content.cefr_level),
        topic: normalizeTopic(content.topic),
        is_published: true,
      })
      .select("id")
      .single();

    const questions = Array.isArray(content.questions) ? content.questions : [];
    for (const question of questions) {
      if (!isRecord(question) || question.question_type !== "mcq") continue;
      const options = Array.isArray(question.options) ? question.options.map(String) : [];
      if (options.length < 3 || !passage?.id) continue;
      await supabase.from("questions").insert({
        passage_id: passage.id,
        exam_type: normalizeExam(content.exam_type),
        skill_type: "reading",
        cefr_level: normalizeCefr(content.cefr_level),
        topic: normalizeTopic(content.topic),
        question_text: String(question.question ?? ""),
        options: options as unknown as Json,
        correct_answer_index: inferCorrectAnswerIndex(question.correct_answer, options),
        explanation: String(question.explanation ?? ""),
        is_published: true,
      });
    }
    counts.passages += 1;
    return;
  }

  if (itemType === "writing_prompt") {
    await supabase.from("writing_prompts").insert({
      title: item.title ?? String(content.title ?? "Imported writing prompt"),
      prompt: String(content.content ?? content.french_text ?? content.summary ?? ""),
      exam_type: normalizeExam(content.exam_type),
      cefr_level: normalizeCefr(content.cefr_level),
      is_published: true,
    });
    counts.writingPrompts += 1;
    return;
  }

  if (itemType === "speaking_prompt") {
    await supabase.from("speaking_prompts").insert({
      title: item.title ?? String(content.title ?? "Imported speaking prompt"),
      prompt: String(content.content ?? content.french_text ?? content.summary ?? ""),
      exam_type: normalizeExam(content.exam_type),
      cefr_level: normalizeCefr(content.cefr_level),
      is_published: true,
    });
    counts.speakingPrompts += 1;
    return;
  }

  await supabase.from("generated_exercises").insert({
    title: item.title,
    exercise_type: itemType,
    content_json: item.content_json,
    source_import_id: batchId,
    cefr_level: normalizeCefr(content.cefr_level),
    topic: normalizeTopic(content.topic),
    exam_type: normalizeExam(content.exam_type),
    tags: normalizeTags(content.tags),
    is_published: true,
  });
  counts.exercises += 1;
}

async function createBatch(
  supabase: SupabaseAdmin,
  payload: Database["public"]["Tables"]["pdf_import_batches"]["Insert"],
) {
  const { error } = await supabase.from("pdf_import_batches").insert(payload);
  if (error) throwPdfImportError(error, "pdf_import_batches", "Unable to create PDF import batch.");
}

async function updateBatch(
  supabase: SupabaseAdmin,
  batchId: string,
  payload: Database["public"]["Tables"]["pdf_import_batches"]["Update"],
) {
  const { error } = await supabase.from("pdf_import_batches").update(payload).eq("id", batchId);
  if (error) throwPdfImportError(error, "pdf_import_batches", "Unable to update PDF import batch.");
}

function throwPdfImportError(error: unknown, tableName: string, fallback: string): never {
  const migrationError = toMissingMigrationError(error, tableName);
  if (migrationError) {
    throw migrationError;
  }

  throw new Error(error instanceof Error ? error.message : fallback);
}

function cleanPdfText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function getSuggestedDestination(itemType: string) {
  if (["vocabulary", "phrase", "connector"].includes(itemType)) return "vocabulary";
  if (itemType === "grammar_concept") return "concepts";
  if (itemType === "reading_passage") return "passages/questions";
  if (itemType === "writing_prompt") return "writing_prompts";
  if (itemType === "speaking_prompt") return "speaking_prompts";
  return "generated_exercises";
}

function normalizeCefr(value: unknown) {
  const normalized = String(value ?? "B1").toUpperCase().replace("+", "_PLUS");
  return ["A1", "A2", "B1", "B1_PLUS", "B2", "B2_PLUS"].includes(normalized)
    ? normalized
    : "B1";
}

function normalizeExam(value: unknown) {
  const normalized = String(value ?? "BOTH").toUpperCase();
  if (normalized === "TEF") return "TEF_CANADA";
  if (normalized === "TCF") return "TCF_CANADA";
  if (normalized === "TEF_CANADA" || normalized === "TCF_CANADA") return normalized;
  return "BOTH";
}

function normalizeTopic(value: unknown) {
  const normalized = String(value ?? "EDUCATION").toUpperCase().replace(/[\s-]+/g, "_");
  const map: Record<string, string> = {
    ADMIN: "ADMINISTRATION",
    GRAMMAR: "EDUCATION",
    DAILY: "DAILY_LIFE",
    DAILY_LIFE: "DAILY_LIFE",
  };
  const topic = map[normalized] ?? normalized;
  return [
    "WORK",
    "HOUSING",
    "HEALTH",
    "ADMINISTRATION",
    "OPINION",
    "EDUCATION",
    "IMMIGRATION",
    "DAILY_LIFE",
    "ENVIRONMENT",
    "TECHNOLOGY",
    "CULTURE",
    "TRAVEL",
  ].includes(topic)
    ? topic
    : "EDUCATION";
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function inferCorrectAnswerIndex(value: unknown, options: string[]) {
  const answer = String(value ?? "").trim();
  const letterIndex = ["A", "B", "C", "D"].indexOf(answer.toUpperCase());
  if (letterIndex >= 0 && letterIndex < options.length) {
    return letterIndex;
  }

  const exactIndex = options.findIndex(
    (option) => option.trim().toLowerCase() === answer.toLowerCase(),
  );
  return exactIndex >= 0 ? exactIndex : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
