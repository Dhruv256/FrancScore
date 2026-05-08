import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import WebSocket from "ws";
import * as XLSX from "xlsx";
import { cleanupVocabularyRowsWithAI, type CleanedImportItem } from "../src/lib/ai/import-cleanup.ts";
import {
  classifyVocabularyRow,
  createFallbackExample,
  normalizeVocabularyKey,
  type ClassifiedVocabularyRow,
  type RawVocabularyImportRow,
} from "../src/lib/import/classify-vocab-row.ts";

type ImportAction = "imported" | "skipped" | "concept_created" | "duplicate" | "needs_review";

const args = parseArgs(process.argv.slice(2));
const workbookPath = String(args.file ?? resolve(process.cwd(), "..", "French_schedule.xlsx"));
const dryRun = Boolean(args["dry-run"] ?? args.preview);
const useAi = !args["no-ai"];

loadEnvFile(".env.local");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  if (!existsSync(workbookPath)) {
    throw new Error(`Excel file not found: ${workbookPath}`);
  }

  const workbook = XLSX.readFile(workbookPath, { cellDates: false });
  const rawRows = parseWorkbook(workbook);
  let classifiedRows = rawRows.map(classifyVocabularyRow);
  let aiCleanedCount = 0;

  if (useAi) {
    const aiCandidates = classifiedRows.filter(
      (row) => row.needsAiCleanup || row.detectedType === "uncertain",
    );
    try {
      const cleanedItems = await cleanupVocabularyRowsWithAI(aiCandidates.slice(0, 80));
      aiCleanedCount = cleanedItems.length;
      classifiedRows = mergeAiCleanup(classifiedRows, cleanedItems);
    } catch (error) {
      console.warn(
        `AI cleanup unavailable; using deterministic cleanup only. ${
          error instanceof Error ? error.message : "Unknown AI error"
        }`,
      );
    }
  }

  classifiedRows = classifiedRows.map((row) => {
    if (!row.shouldImportAsFlashcard || (row.frenchExample && row.englishExampleTranslation)) {
      return row;
    }
    const example = createFallbackExample(row);
    return {
      ...row,
      frenchExample: example.frenchExample,
      englishExampleTranslation: example.englishExampleTranslation,
      reason: `${row.reason} Example generated deterministically.`,
    };
  });

  const report = createBaseReport(workbook, rawRows, classifiedRows, aiCleanedCount);

  if (dryRun) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket },
    },
  );

  const { data: batch, error: batchError } = await supabase
    .from("vocabulary_import_batches")
    .insert({
      file_name: basename(workbookPath),
      total_rows: rawRows.length,
      status: "processing",
    })
    .select("*")
    .single();

  if (batchError || !batch) {
    throw new Error(`Unable to create import batch. Apply migration first. ${batchError?.message ?? ""}`);
  }

  try {
    const existingKeys = await loadExistingVocabularyKeys(supabase);
    const rowLogs = [];

    for (const row of classifiedRows) {
      const action = await processRow(supabase, row, batch.id, existingKeys);
      rowLogs.push(toRowLog(batch.id, row, action.action, action.reason));
      report[action.reportKey] += 1;
    }

    for (const batchRows of chunk(rowLogs, 200)) {
      const { error } = await supabase.from("vocabulary_import_rows").insert(batchRows);
      if (error) throw new Error(`Unable to write import row audit log: ${error.message}`);
    }

    const { error: updateError } = await supabase
      .from("vocabulary_import_batches")
      .update({
        imported_count: report.imported_count,
        skipped_count: report.skipped_count,
        concept_count: report.concept_count,
        duplicate_count: report.duplicate_count,
        ai_cleaned_count: report.ai_cleaned_count,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batch.id);

    if (updateError) throw new Error(`Unable to finalize import batch: ${updateError.message}`);
    console.log(JSON.stringify({ ...report, batchId: batch.id }, null, 2));
  } catch (error) {
    await supabase
      .from("vocabulary_import_batches")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown import error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batch.id);
    throw error;
  }
}

function parseWorkbook(workbookFile: XLSX.WorkBook): RawVocabularyImportRow[] {
  const rows: RawVocabularyImportRow[] = [];
  let rowNumber = 1;

  for (const sheetName of workbookFile.SheetNames) {
    const worksheet = workbookFile.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<Array<string | number | null>>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    const headers = findHeaderRow(matrix);

    for (const [index, row] of matrix.entries()) {
      const rawCells = row.map((cell) => String(cell ?? "").trim());
      if (!rawCells.some(Boolean)) continue;
      if (headers && index <= headers.index) continue;

      const rawJson = headers
        ? Object.fromEntries(headers.names.map((header, cellIndex) => [header, rawCells[cellIndex] ?? ""]))
        : Object.fromEntries(rawCells.map((cell, cellIndex) => [`col_${cellIndex + 1}`, cell]));

      rows.push({
        rowNumber,
        sheetName,
        frenchWord: pickValue(rawJson, ["french_word", "french", "word", "mot", "vocabulary", "vocab"]) ?? rawCells[0],
        englishMeaning: pickValue(rawJson, ["english_meaning", "english", "meaning", "translation"]) ?? rawCells[1],
        frenchExample: pickValue(rawJson, ["french_example", "example", "sentence"]) ?? rawCells[2],
        englishExampleTranslation: pickValue(rawJson, ["english_example_translation", "english_example", "example_translation"]) ?? rawCells[3],
        cefrLevel: pickValue(rawJson, ["cefr_level", "level", "cefr"]),
        topic: pickValue(rawJson, ["topic", "category"]) ?? sheetName,
        tags: splitTags(pickValue(rawJson, ["tags", "tag"])),
        rawCells,
        rawJson,
      });
      rowNumber += 1;
    }
  }

  return rows;
}

function findHeaderRow(matrix: Array<Array<string | number | null>>) {
  for (let index = 0; index < Math.min(matrix.length, 12); index += 1) {
    const names = matrix[index].map((cell) => normalizeHeader(String(cell ?? "")));
    if (names.some((name) => name === "french_word") || names.some((name) => name === "english_meaning")) {
      return { index, names };
    }
  }
  return null;
}

function normalizeHeader(header: string) {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (["french", "word", "mot", "vocabulary", "vocab", "french_word"].includes(normalized)) return "french_word";
  if (["english", "meaning", "translation", "english_meaning"].includes(normalized)) return "english_meaning";
  if (["example", "sentence", "french_example"].includes(normalized)) return "french_example";
  if (["english_example", "example_translation", "english_translation"].includes(normalized)) return "english_example_translation";
  if (["level", "cefr", "cefr_level"].includes(normalized)) return "cefr_level";
  if (["topic", "category"].includes(normalized)) return "topic";
  if (["tags", "tag"].includes(normalized)) return "tags";
  return normalized;
}

function mergeAiCleanup(rows: ClassifiedVocabularyRow[], items: CleanedImportItem[]) {
  const byRowNumber = new Map(items.map((item) => [item.row_number, item]));
  return rows.map((row) => {
    const cleaned = byRowNumber.get(row.rowNumber);
    if (!cleaned) return row;
    return {
      ...row,
      detectedType: cleaned.detected_type,
      shouldImportAsFlashcard: cleaned.should_import_as_flashcard,
      frenchWord: cleaned.french_word.trim(),
      englishMeaning: cleaned.english_meaning.trim(),
      frenchExample: cleaned.french_example.trim() || null,
      englishExampleTranslation: cleaned.english_example_translation.trim() || null,
      cefrLevel: cleaned.cefr_level,
      topic: cleaned.topic.toUpperCase(),
      examType: cleaned.exam_type,
      tags: [...new Set(["excel-import", ...cleaned.tags.map((tag) => tag.toLowerCase())])],
      confidence: cleaned.confidence,
      reason: `AI cleanup: ${cleaned.reason}`,
      needsAiCleanup: false,
    } satisfies ClassifiedVocabularyRow;
  });
}

async function processRow(
  supabase: ReturnType<typeof createClient>,
  row: ClassifiedVocabularyRow,
  batchId: string,
  existingKeys: Set<string>,
): Promise<{ action: ImportAction; reason: string; reportKey: "imported_count" | "skipped_count" | "concept_count" | "duplicate_count" }> {
  if (row.detectedType === "grammar_concept") {
    const conceptPayload = {
      title: row.frenchWord || row.englishMeaning || `Concept row ${row.rowNumber}`,
      description: row.englishMeaning || row.reason,
      french_example: row.frenchExample,
      english_explanation: row.englishExampleTranslation,
      level: row.cefrLevel,
      topic: row.topic,
      exam_type: row.examType,
      tags: [...new Set([...row.tags, "grammar-concept"])],
      source_import_id: batchId,
      is_published: false,
    };
    const { data: existingConcept } = await supabase
      .from("concepts")
      .select("id")
      .ilike("title", conceptPayload.title)
      .eq("topic", conceptPayload.topic)
      .maybeSingle();
    const { error } = existingConcept
      ? await supabase.from("concepts").update(conceptPayload).eq("id", existingConcept.id)
      : await supabase.from("concepts").insert(conceptPayload);
    if (error) return { action: "needs_review", reason: error.message, reportKey: "skipped_count" };
    return { action: "concept_created", reason: row.reason, reportKey: "concept_count" };
  }

  if (!row.shouldImportAsFlashcard) {
    return { action: "skipped", reason: row.reason, reportKey: "skipped_count" };
  }

  const normalizedKey = normalizeVocabularyKey(row.frenchWord);
  if (!normalizedKey || existingKeys.has(normalizedKey)) {
    return { action: "duplicate", reason: "Duplicate normalized French term.", reportKey: "duplicate_count" };
  }

  const { error } = await supabase.from("vocabulary").insert({
    french_word: row.frenchWord,
    english_meaning: row.englishMeaning,
    french_example: row.frenchExample,
    english_example_translation: row.englishExampleTranslation,
    cefr_level: row.cefrLevel,
    topic: row.topic,
    exam_type: row.examType,
    frequency_score: row.frequencyScore,
    tags: [...new Set([...row.tags, row.detectedType.replace("_", "-")])],
    source_import_id: batchId,
    import_confidence: row.confidence,
    is_published: true,
  });

  if (error) {
    return { action: "needs_review", reason: error.message, reportKey: "skipped_count" };
  }

  existingKeys.add(normalizedKey);
  return { action: "imported", reason: row.reason, reportKey: "imported_count" };
}

async function loadExistingVocabularyKeys(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.from("vocabulary").select("french_word");
  if (error) throw new Error(`Unable to inspect existing vocabulary: ${error.message}`);
  return new Set((data ?? []).map((row) => normalizeVocabularyKey(String(row.french_word ?? ""))));
}

function toRowLog(batchId: string, row: ClassifiedVocabularyRow, action: ImportAction, reason: string) {
  return {
    batch_id: batchId,
    row_number: row.rowNumber,
    raw_json: row.raw.rawJson,
    detected_type: row.detectedType,
    action_taken: action,
    reason,
    normalized_json: {
      french_word: row.frenchWord,
      english_meaning: row.englishMeaning,
      french_example: row.frenchExample,
      english_example_translation: row.englishExampleTranslation,
      cefr_level: row.cefrLevel,
      topic: row.topic,
      exam_type: row.examType,
      tags: row.tags,
    },
    confidence: row.confidence,
  };
}

function createBaseReport(
  workbook: XLSX.WorkBook,
  rawRows: RawVocabularyImportRow[],
  classifiedRows: ClassifiedVocabularyRow[],
  aiCleanedCount: number,
) {
  return {
    workbookPath,
    sheetsDetected: workbook.SheetNames,
    total_rows: rawRows.length,
    vocabulary_candidates: classifiedRows.filter((row) => row.shouldImportAsFlashcard).length,
    grammar_concepts: classifiedRows.filter((row) => row.detectedType === "grammar_concept").length,
    skipped_preview: classifiedRows.filter((row) => !row.shouldImportAsFlashcard && row.detectedType !== "grammar_concept").length,
    imported_count: 0,
    skipped_count: 0,
    concept_count: 0,
    duplicate_count: 0,
    ai_cleaned_count: aiCleanedCount,
    dryRun,
  };
}

function pickValue(rawJson: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = rawJson[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function splitTags(value?: string) {
  return (value ?? "")
    .split(/[,;|]/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function parseArgs(rawArgs: string[]) {
  const parsed: Record<string, string | boolean | undefined> = {};
  for (const arg of rawArgs) {
    const [key, ...valueParts] = arg.replace(/^--/, "").split("=");
    parsed[key] = valueParts.length ? valueParts.join("=") : true;
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
    throw new Error(`${name} is required for live import. Use --dry-run to inspect without writing.`);
  }
  return value;
}
