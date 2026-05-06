import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";
import * as XLSX from "xlsx";

type VocabularyImportRow = {
  french_word: string;
  english_meaning: string;
  french_example: string | null;
  english_example_translation: string | null;
  cefr_level: string;
  topic: string;
  exam_type: string;
  frequency_score: number;
  tags: string[];
  is_published: boolean;
};

const workbookPath =
  process.argv.find((arg) => arg.startsWith("--file="))?.slice("--file=".length) ??
  resolve(process.cwd(), "..", "French_schedule.xlsx");
const dryRun = process.argv.includes("--dry-run");

loadEnvFile(".env.local");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const workbook = XLSX.readFile(workbookPath, { cellDates: false });
  const parsedRows = parseWorkbook(workbook);
  const uniqueRows = dedupeRows(parsedRows.rows);

  const report = {
    workbookPath,
    sheetsDetected: workbook.SheetNames,
    parsedRows: parsedRows.rows.length,
    skippedRows: parsedRows.skipped,
    uniqueRows: uniqueRows.length,
    insertedRows: 0,
    existingRowsSkipped: 0,
    dryRun,
  };

  if (!dryRun) {
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket },
    });

    const { data: existing, error: existingError } = await supabase
      .from("vocabulary")
      .select("french_word,english_meaning");

    if (existingError) {
      throw new Error(`Unable to inspect existing vocabulary: ${existingError.message}`);
    }

    const existingKeys = new Set(
      (existing ?? []).map((row) => buildDedupeKey(row.french_word, row.english_meaning)),
    );
    const rowsToInsert = uniqueRows.filter((row) => {
      const key = buildDedupeKey(row.french_word, row.english_meaning);
      if (existingKeys.has(key)) {
        return false;
      }
      existingKeys.add(key);
      return true;
    });

    report.existingRowsSkipped = uniqueRows.length - rowsToInsert.length;

    for (const batch of chunk(rowsToInsert, 200)) {
      const { error } = await supabase.from("vocabulary").insert(batch);
      if (error) {
        throw new Error(`Vocabulary import failed: ${error.message}`);
      }
      report.insertedRows += batch.length;
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

function parseWorkbook(workbookFile: XLSX.WorkBook) {
  const rows: VocabularyImportRow[] = [];
  let skipped = 0;

  for (const sheetName of workbookFile.SheetNames) {
    const worksheet = workbookFile.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<Array<string | number | null>>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    const headers = findHeaderRow(matrix);
    const inferredTopic = inferTopic(sheetName);

    if (headers) {
      for (const row of matrix.slice(headers.index + 1)) {
        const parsed = parseObjectRow(row, headers.names, inferredTopic);
        if (parsed) rows.push(parsed);
        else skipped += 1;
      }
      continue;
    }

    for (const row of matrix) {
      const line = row.map((cell) => String(cell ?? "").trim()).filter(Boolean).join(" ");
      const parsed = parseLineRow(line, inferredTopic);
      if (parsed) rows.push(parsed);
      else skipped += line ? 1 : 0;
    }
  }

  return { rows, skipped };
}

function findHeaderRow(matrix: Array<Array<string | number | null>>) {
  for (let index = 0; index < Math.min(matrix.length, 12); index += 1) {
    const names = matrix[index].map((cell) => normalizeHeader(String(cell ?? "")));
    if (names.some((name) => name === "french_word") && names.some((name) => name === "english_meaning")) {
      return { index, names };
    }
  }
  return null;
}

function parseObjectRow(
  row: Array<string | number | null>,
  headers: string[],
  fallbackTopic: string,
): VocabularyImportRow | null {
  const values = Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()]));
  const frenchWord = values.french_word;
  const englishMeaning = values.english_meaning;

  if (!frenchWord || !englishMeaning) {
    return null;
  }

  return normalizeVocabularyRow({
    frenchWord,
    englishMeaning,
    frenchExample: values.french_example,
    englishExampleTranslation: values.english_example_translation,
    cefrLevel: values.cefr_level,
    topic: values.topic || fallbackTopic,
    tags: splitTags(values.tags),
  });
}

function parseLineRow(line: string, fallbackTopic: string): VocabularyImportRow | null {
  const cleaned = line
    .replace(/^\s*\d+[\).:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = cleaned.match(/^(.+?)\s*(?:—|--|-|:)\s*(.+)$/);
  if (!match) {
    return null;
  }

  const frenchWord = match[1]?.trim();
  const englishMeaning = match[2]?.replace(/\([^)]*\)/g, "").trim();
  if (!frenchWord || !englishMeaning || frenchWord.length > 80 || englishMeaning.length > 140) {
    return null;
  }

  return normalizeVocabularyRow({
    frenchWord,
    englishMeaning,
    topic: fallbackTopic,
    tags: inferTags(frenchWord, fallbackTopic),
  });
}

function normalizeVocabularyRow(input: {
  frenchWord: string;
  englishMeaning: string;
  frenchExample?: string;
  englishExampleTranslation?: string;
  cefrLevel?: string;
  topic?: string;
  tags?: string[];
}): VocabularyImportRow {
  const topic = normalizeTopic(input.topic);
  const cefrLevel = normalizeCefr(input.cefrLevel, input.frenchWord);
  const tags = [...new Set(["excel-import", topic.toLowerCase(), ...(input.tags ?? [])])];

  return {
    french_word: input.frenchWord.trim(),
    english_meaning: input.englishMeaning.trim(),
    french_example:
      input.frenchExample?.trim() ||
      `Dans un contexte d'examen, le mot "${input.frenchWord.trim()}" peut changer le sens de la phrase.`,
    english_example_translation:
      input.englishExampleTranslation?.trim() ||
      `In an exam context, the word "${input.frenchWord.trim()}" can change the meaning of the sentence.`,
    cefr_level: cefrLevel,
    topic,
    exam_type: "BOTH",
    frequency_score: inferFrequencyScore(cefrLevel, tags),
    tags,
    is_published: true,
  };
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

function normalizeCefr(value: string | undefined, frenchWord: string) {
  const upper = value?.trim().toUpperCase().replace("-", "_");
  if (upper && ["A1", "A2", "B1", "B1_PLUS", "B2", "B2_PLUS", "C1"].includes(upper)) {
    return upper;
  }

  if (frenchWord.length > 16 || frenchWord.includes(" ")) return "B1_PLUS";
  return "B1";
}

function normalizeTopic(value: string | undefined) {
  const upper = value?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_") ?? "";
  if (upper.includes("WORK") || upper.includes("JOB")) return "WORK";
  if (upper.includes("HOUSE") || upper.includes("LOGEMENT")) return "HOUSING";
  if (upper.includes("HEALTH") || upper.includes("SANTE")) return "HEALTH";
  if (upper.includes("ADMIN")) return "ADMINISTRATION";
  if (upper.includes("OPINION")) return "OPINION";
  if (upper.includes("EDUCATION") || upper.includes("STUDY")) return "EDUCATION";
  if (upper.includes("IMMIGRATION")) return "IMMIGRATION";
  if (upper.includes("TRAVEL")) return "TRAVEL";
  return "DAILY_LIFE";
}

function inferTopic(sheetName: string) {
  if (/day\s*[12]/i.test(sheetName)) return "DAILY_LIFE";
  if (/work|job|emploi/i.test(sheetName)) return "WORK";
  if (/admin|immigration/i.test(sheetName)) return "ADMINISTRATION";
  return "DAILY_LIFE";
}

function inferTags(frenchWord: string, topic: string) {
  const lower = frenchWord.toLowerCase();
  const tags = [topic.toLowerCase()];
  if (["mais", "donc", "parce que", "pourtant", "cependant", "toutefois", "ainsi"].includes(lower)) {
    tags.push("connector");
  }
  if (["jamais", "rien", "personne", "ni", "sans", "pas du tout"].some((token) => lower.includes(token))) {
    tags.push("listening-trap", "negation");
  }
  if (/\d|heure|demain|hier|aujourd/.test(lower)) {
    tags.push("listening-trap", "time");
  }
  return tags;
}

function inferFrequencyScore(level: string, tags: string[]) {
  if (tags.includes("connector")) return 92;
  if (tags.includes("listening-trap")) return 88;
  if (level.startsWith("B2")) return 82;
  return 76;
}

function splitTags(value?: string) {
  return (value ?? "")
    .split(/[,;|]/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function dedupeRows(rows: VocabularyImportRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = buildDedupeKey(row.french_word, row.english_meaning);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDedupeKey(frenchWord: string, englishMeaning: string) {
  return `${frenchWord.trim().toLowerCase()}::${englishMeaning.trim().toLowerCase()}`;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function loadEnvFile(fileName: string) {
  const envPath = resolve(process.cwd(), fileName);
  try {
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
  } catch {
    // The caller may provide env vars through the shell instead.
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for live import. Use --dry-run to inspect the workbook without writing.`);
  }
  return value;
}
