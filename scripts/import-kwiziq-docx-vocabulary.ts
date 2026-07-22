/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

type Level = "A0" | "A1" | "A2" | "B1" | "B2" | "C1";
type VocabularyRow = {
  french_word: string; english_meaning: string; cefr_level: Level; topic: string;
  category_slug: string; broad_category: string; source: string; source_document: string;
  source_row_key: string; is_published: boolean; exam_type: "BOTH"; frequency_score: number;
  french_example: null; english_example_translation: null;
};

const expectedFile = "kwiziq_french_vocabulary_word_level.docx";
const levels: Level[] = ["A0", "A1", "A2", "B1", "B2", "C1"];
const reportPath = resolve("scripts/import-reports/kwiziq-docx-vocabulary-report.json");
const dataPath = resolve("scripts/import-data/kwiziq-vocabulary-normalized.json");
const levelHeadings: Record<string, Level> = {
  "A0 — Entry Level": "A0", "A1 — Beginner": "A1", "A2 — Lower Intermediate": "A2",
  "B1 — Intermediate": "B1", "B2 — Upper Intermediate": "B2", "C1 — Advanced": "C1",
};

function clean(value: string) {
  return value.normalize("NFKC").replace(/[\u00ad\u200b\ufeff]/g, "").replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ").trim();
}
function keyPart(value: string) { return clean(value).toLocaleLowerCase("fr-FR").replace(/[’‘`]/g, "'"); }
function slug(value: string) {
  return keyPart(value).replace(/\b(in|en) french\b/g, "").replace(/\bfrench\b/g, "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
const broadRules: [string, string[]][] = [
  ["People and Family", ["family", "relatives", "greetings", "nationalit"]],
  ["Food and Drink", ["restaurant", "fruit", "bakery", "drink", "cooking", "food", "beverage"]],
  ["Home", ["bedroom", "bathroom", "kitchen", "house", "chores", "home"]],
  ["Travel and Transport", ["travel", "transport", "direction", "hotel", "seaside", "airport"]],
  ["Work and Education", ["job", "school", "office", "profession", "work", "education"]],
  ["Health and Body", ["body", "face", "health", "medicine", "doctor"]],
  ["Technology", ["computer", "email", "internet", "technology", "digital"]],
  ["Grammar and Connectors", ["verb", "preposition", "adverb", "conjunction", "connecting", "grammar"]],
  ["Emotions and Opinions", ["emotion", "mood", "opinion", "love", "feeling"]],
  ["Nature and Animals", ["animal", "nature", "forest", "countryside", "wild", "pet"]],
  ["Culture and Events", ["christmas", "easter", "halloween", "festival", "culture", "bastille", "patrick"]],
  ["Clothing and Appearance", ["clothing", "hairdresser", "make-up", "jewellery", "appearance"]],
  ["Numbers and Time", ["number", "time", "date", "days", "month", "clock"]],
];
function broadCategory(theme: string) {
  const value = keyPart(theme);
  return broadRules.find(([, words]) => words.some((word) => value.includes(word)))?.[0] ?? "Other";
}

function zipEntry(buffer: Buffer, name: string) {
  const eocd = buffer.lastIndexOf(Buffer.from("PK\x05\x06"));
  if (eocd < 0) throw new Error("DOCX zip directory not found");
  const count = buffer.readUInt16LE(eocd + 10), offset = buffer.readUInt32LE(eocd + 16);
  let cursor = offset;
  for (let i = 0; i < count; i++) {
    if (buffer.toString("utf8", cursor, cursor + 4) !== "PK\x01\x02") throw new Error("Invalid DOCX central directory");
    const method = buffer.readUInt16LE(cursor + 10), compressed = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32);
    const entryName = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    if (entryName === name) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26), localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const body = buffer.subarray(localOffset + 30 + localNameLength + localExtraLength, localOffset + 30 + localNameLength + localExtraLength + compressed);
      return method === 8 ? inflateRawSync(body).toString("utf8") : body.toString("utf8");
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`DOCX entry missing: ${name}`);
}
function xmlText(fragment: string) {
  return clean(fragment.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
}
function parseDocument(filePath: string) {
  const xml = zipEntry(readFileSync(filePath), "word/document.xml");
  let level: Level | null = null; let totalTablesFound = 0; let totalRowsScanned = 0;
  const rows: VocabularyRow[] = []; const skippedReasons: { reason: string; row: string[] }[] = [];
  const seen = new Set<string>(); const themes = new Set<string>(); const counts = Object.fromEntries(levels.map((x) => [x, 0])) as Record<Level, number>;
  const body = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/)?.[1] ?? "";
  const children = body.match(/<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/g) ?? [];
  for (const child of children) {
    if (child.startsWith("<w:p")) { const heading = xmlText([...child.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(" ")); if (levelHeadings[heading]) level = levelHeadings[heading]; else if (heading === "Other valid theme pages" || heading === "Stale or unavailable index links") level = null; continue; }
    totalTablesFound++;
    const trs = child.match(/<w:tr[\s\S]*?<\/w:tr>/g) ?? [];
    for (const tr of trs) {
      const cells = (tr.match(/<w:tc[\s\S]*?<\/w:tc>/g) ?? []).map((tc) => xmlText([...tc.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join(" ")));
      if (!cells.length) continue; totalRowsScanned++;
      if (cells[0] === "Theme" && cells[1] === "French") { skippedReasons.push({ reason: "repeated table heading", row: cells }); continue; }
      const [theme, french, english] = cells;
      if (!level) { skippedReasons.push({ reason: "no valid CEFR level from nearest heading", row: cells }); continue; }
      if (!clean(french)) { skippedReasons.push({ reason: "French is empty", row: cells }); continue; }
      if (!clean(english)) { skippedReasons.push({ reason: "English is empty", row: cells }); continue; }
      const topic = clean(theme); const frenchWord = clean(french); const englishMeaning = clean(english);
      const source_row_key = createHash("sha256").update([level, keyPart(topic), keyPart(frenchWord), keyPart(englishMeaning)].join("|")).digest("hex");
      if (seen.has(source_row_key)) { skippedReasons.push({ reason: "duplicate composite key", row: cells }); continue; }
      seen.add(source_row_key); themes.add(topic); counts[level]++;
      rows.push({ french_word: frenchWord, english_meaning: englishMeaning, cefr_level: level, topic, category_slug: slug(topic), broad_category: broadCategory(topic), source: "kwiziq_docx", source_document: expectedFile, source_row_key, is_published: true, exam_type: "BOTH", frequency_score: 50, french_example: null, english_example_translation: null });
    }
  }
  return { totalTablesFound, totalRowsScanned, rows, themes, counts, skippedReasons };
}
function findFile() {
  const candidates = [join(process.cwd(), expectedFile), join("C:\\Users\\dhruv\\Documents\\Codex\\2026-07-22\\https-french-kwiziq-com-learn-theme\\outputs", expectedFile), join("/mnt/data", expectedFile)];
  const file = candidates.find(existsSync); if (!file) throw new Error(`Unable to detect ${expectedFile}. Checked: ${candidates.join(", ")}`); return resolve(file);
}
function loadEnv() {
  for (const file of [".env.local", ".env"]) if (existsSync(file)) for (const line of readFileSync(file, "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ""); }
}
async function main() {
  loadEnv(); const detectedFilePath = findFile(); const parsed = parseDocument(detectedFilePath); const dryRun = process.argv.includes("--dry-run");
  mkdirSync(dirname(reportPath), { recursive: true }); mkdirSync(dirname(dataPath), { recursive: true }); writeFileSync(dataPath, JSON.stringify(parsed.rows, null, 2) + "\n");
  const report: any = { detectedFilePath, file: expectedFile, totalTablesFound: parsed.totalTablesFound, totalRowsScanned: parsed.totalRowsScanned, validRows: parsed.rows.length, insertedRows: 0, updatedRows: 0, duplicateRows: parsed.skippedReasons.filter((x) => x.reason.includes("duplicate")).length, skippedRows: parsed.skippedReasons.length, rowsByLevel: parsed.counts, themesFound: parsed.themes.size, skippedReasons: parsed.skippedReasons.slice(0, 200), sampleRows: parsed.rows.slice(0, 20) };
  if (!dryRun && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws as any } });
    for (let i = 0; i < parsed.rows.length; i += 250) {
      const batch = parsed.rows.slice(i, i + 250); const { data, error } = await supabase.from("vocabulary").upsert(batch, { onConflict: "source_row_key", ignoreDuplicates: false }).select("id");
      if (error) throw new Error(`Supabase batch ${i / 250 + 1} failed: ${error.message}`); report.insertedRows += data?.length ?? batch.length;
    }
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n"); console.log(JSON.stringify(report, null, 2));
  if (!dryRun && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) console.log(`Supabase unavailable; normalized dataset written to ${dataPath}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
