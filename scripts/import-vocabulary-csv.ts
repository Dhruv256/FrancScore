import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type CsvRow = {
  french_word: string;
  english_meaning: string;
  french_example?: string;
  english_example_translation?: string;
  cefr_level?: string;
  topic?: string;
  exam_type?: string;
  frequency_score?: string;
  tags?: string;
};

const REQUIRED_HEADERS = [
  "french_word",
  "english_meaning",
  "french_example",
  "english_example_translation",
  "cefr_level",
  "topic",
  "exam_type",
  "frequency_score",
  "tags",
] as const;

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    throw new Error(
      "Usage: node --experimental-strip-types scripts/import-vocabulary-csv.ts <path-to-file.csv>",
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Load your server-side Supabase env vars before importing.",
    );
  }

  const source = await readFile(resolve(csvPath), "utf8");
  const records = parseCsv(source);

  if (!records.length) {
    throw new Error("The CSV file did not contain any vocabulary rows.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const payload = records.map((row) => ({
    id: createStableVocabularyId(row),
    french_word: row.french_word.trim(),
    english_meaning: row.english_meaning.trim(),
    french_example: normalizeNullable(row.french_example),
    english_example_translation: normalizeNullable(row.english_example_translation),
    cefr_level: (normalizeNullable(row.cefr_level) ?? "B1").toUpperCase(),
    topic: (normalizeNullable(row.topic) ?? "DAILY_LIFE").toUpperCase(),
    exam_type: (normalizeNullable(row.exam_type) ?? "BOTH").toUpperCase(),
    frequency_score: Number.parseInt(row.frequency_score ?? "0", 10) || 0,
    tags: parseTags(row.tags),
    is_published: true,
  }));

  const { error } = await supabase.from("vocabulary").upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(`Supabase import failed: ${error.message}`);
  }

  console.log(`Imported ${payload.length} vocabulary rows into public.vocabulary.`);
  console.log("Next step: review tags/topics in admin if you imported a new PDF extraction.");
}

function parseCsv(input: string): CsvRow[] {
  const lines = input
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  validateHeaders(headers);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return row as CsvRow;
  });
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function validateHeaders(headers: string[]) {
  for (const header of REQUIRED_HEADERS) {
    if (!headers.includes(header)) {
      throw new Error(
        `Missing CSV header "${header}". Expected headers: ${REQUIRED_HEADERS.join(", ")}`,
      );
    }
  }
}

function createStableVocabularyId(row: CsvRow) {
  const digest = createHash("sha256")
    .update(
      [
        row.french_word.trim().toLowerCase(),
        row.english_meaning.trim().toLowerCase(),
        row.topic?.trim().toUpperCase() ?? "",
        row.exam_type?.trim().toUpperCase() ?? "",
      ].join("|"),
    )
    .digest("hex");

  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

function normalizeNullable(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseTags(value?: string) {
  const raw = normalizeNullable(value);
  if (!raw) {
    return [];
  }

  return raw
    .split(/[|;]/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown CSV import error.");
  process.exitCode = 1;
});
