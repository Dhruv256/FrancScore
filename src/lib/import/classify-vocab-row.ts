export type ImportDetectedType =
  | "vocabulary_word"
  | "phrase"
  | "connector"
  | "grammar_concept"
  | "study_schedule"
  | "section_heading"
  | "example_only"
  | "invalid"
  | "uncertain";

export type RawVocabularyImportRow = {
  rowNumber: number;
  sheetName: string;
  frenchWord?: string;
  englishMeaning?: string;
  frenchExample?: string;
  englishExampleTranslation?: string;
  cefrLevel?: string;
  topic?: string;
  tags?: string[];
  rawCells: string[];
  rawJson: Record<string, unknown>;
};

export type ClassifiedVocabularyRow = {
  rowNumber: number;
  detectedType: ImportDetectedType;
  shouldImportAsFlashcard: boolean;
  frenchWord: string;
  englishMeaning: string;
  frenchExample: string | null;
  englishExampleTranslation: string | null;
  cefrLevel: string;
  topic: string;
  examType: string;
  frequencyScore: number;
  tags: string[];
  confidence: number;
  reason: string;
  needsAiCleanup: boolean;
  raw: RawVocabularyImportRow;
};

const SECTION_PATTERNS = [
  /^\s*day\s*\d+\s*$/i,
  /^\s*part\s*\d+\s*$/i,
  /^\s*concepts?\s*$/i,
  /^\s*mini\s*$/i,
  /^\s*collocations\s*\+\s*mini\s*$/i,
  /^\s*vocabulary\s*$/i,
  /^\s*\d+\s*[-–—]\s*\d+\s*$/i,
  /^\s*70\s+high\s*$/i,
  /^\s*french study schedule\s*$/i,
];

const GRAMMAR_PATTERNS = [
  /pass[ée]\s+compos[ée]/i,
  /imparfait/i,
  /avoir\s+vs\s+être/i,
  /\bpronouns?\b|pronoms?/i,
  /mental verbs?/i,
  /time markers?/i,
  /edge cases?/i,
  /grammar|grammaire/i,
  /conjugation|conjugaison/i,
  /\btense\b|temps verbaux/i,
  /comparison|comparatif/i,
];

const CONNECTORS = new Set([
  "ainsi",
  "alors",
  "cependant",
  "donc",
  "ensuite",
  "néanmoins",
  "par ailleurs",
  "par conséquent",
  "pourtant",
  "toutefois",
]);

const GENERIC_EXAMPLE_PATTERNS = [
  /dans un contexte d[’']examen, le mot/i,
  /peut changer le sens de la phrase/i,
  /in an exam context, the word/i,
];

export function classifyVocabularyRow(row: RawVocabularyImportRow): ClassifiedVocabularyRow {
  const frenchWord = cleanTerm(row.frenchWord ?? firstMeaningfulCell(row.rawCells));
  const englishMeaning = cleanMeaning(row.englishMeaning ?? inferMeaningFromCells(row.rawCells, frenchWord));
  const joined = [frenchWord, englishMeaning, ...row.rawCells].join(" ").trim();
  const lower = joined.toLowerCase();

  if (!joined) {
    return invalid(row, "Empty row.");
  }

  if (SECTION_PATTERNS.some((pattern) => pattern.test(frenchWord)) || SECTION_PATTERNS.some((pattern) => pattern.test(joined))) {
    return skip(row, "section_heading", frenchWord, englishMeaning, "Section/day/range heading, not a flashcard.", 0.98);
  }

  if (isStudySchedule(joined)) {
    return skip(row, "study_schedule", frenchWord, englishMeaning, "Study schedule row, not vocabulary.", 0.96);
  }

  if (GRAMMAR_PATTERNS.some((pattern) => pattern.test(lower))) {
    return {
      ...base(row, "grammar_concept", frenchWord, englishMeaning),
      shouldImportAsFlashcard: false,
      topic: "GRAMMAR",
      tags: ["excel-import", "grammar-concept"],
      confidence: 0.9,
      reason: "Grammar concept detected; route to concepts table instead of flashcards.",
      needsAiCleanup: !englishMeaning,
    };
  }

  if (!frenchWord && !englishMeaning) {
    return invalid(row, "Missing French term and English meaning.");
  }

  if (!frenchWord || !englishMeaning) {
    return {
      ...base(row, "uncertain", frenchWord, englishMeaning),
      shouldImportAsFlashcard: false,
      confidence: 0.35,
      reason: "Missing term or meaning; needs AI/user review.",
      needsAiCleanup: true,
    };
  }

  if (mostlyNumbers(frenchWord) || looksLikeHeadingSentence(frenchWord)) {
    return skip(row, "section_heading", frenchWord, englishMeaning, "Looks like a numeric range or heading.", 0.92);
  }

  if (looksExampleOnly(frenchWord, englishMeaning)) {
    return skip(row, "example_only", frenchWord, englishMeaning, "Looks like an example sentence without a reusable term.", 0.82);
  }

  const detectedType = CONNECTORS.has(frenchWord.toLowerCase())
    ? "connector"
    : frenchWord.split(/\s+/).length > 1
      ? "phrase"
      : "vocabulary_word";
  const topic = normalizeTopic(row.topic ?? row.sheetName);
  const cefrLevel = normalizeCefr(row.cefrLevel, frenchWord);
  const tags = [
    "excel-import",
    detectedType.replace("_", "-"),
    topic.toLowerCase(),
    ...(row.tags ?? []),
  ].filter(Boolean);
  const needsAiCleanup = hasBadExample(row.frenchExample, row.englishExampleTranslation);

  return {
    rowNumber: row.rowNumber,
    detectedType,
    shouldImportAsFlashcard: true,
    frenchWord,
    englishMeaning,
    frenchExample: needsAiCleanup ? null : normalizeNullable(row.frenchExample),
    englishExampleTranslation: needsAiCleanup ? null : normalizeNullable(row.englishExampleTranslation),
    cefrLevel,
    topic,
    examType: "BOTH",
    frequencyScore: inferFrequencyScore(detectedType, cefrLevel, tags),
    tags: [...new Set(tags.map((tag) => tag.toLowerCase()))],
    confidence: needsAiCleanup ? 0.72 : 0.88,
    reason: needsAiCleanup
      ? "Valid flashcard row, but example is missing/generic and should be cleaned."
      : "Valid flashcard-worthy row.",
    needsAiCleanup,
    raw: row,
  };
}

export function createFallbackExample(row: ClassifiedVocabularyRow) {
  const term = row.frenchWord.trim();
  const lower = term.toLowerCase();
  const frenchExample = lower.includes("demain")
    ? "On se voit demain après le travail ?"
    : row.detectedType === "connector"
      ? `Il a bien préparé son dossier, pourtant il doit encore vérifier les dates.`
      : row.detectedType === "phrase"
        ? `${term.charAt(0).toUpperCase()}${term.slice(1)} dans un courriel formel.`
        : `Je dois expliquer le mot « ${term} » pendant mon entretien.`;

  const englishExampleTranslation = lower.includes("demain")
    ? "Shall we see each other tomorrow after work?"
    : row.detectedType === "connector"
      ? "He prepared his file well, yet he still has to check the dates."
      : row.detectedType === "phrase"
        ? `${term} in a formal email.`
        : `I have to explain the word "${term}" during my interview.`;

  return { frenchExample, englishExampleTranslation };
}

export function normalizeVocabularyKey(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s'’?-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasBadExample(frenchExample?: string | null, englishExample?: string | null) {
  const joined = `${frenchExample ?? ""} ${englishExample ?? ""}`.trim();
  if (!joined) return true;
  if (new Set([frenchExample?.trim(), englishExample?.trim()].filter(Boolean)).size < 2) return true;
  return GENERIC_EXAMPLE_PATTERNS.some((pattern) => pattern.test(joined));
}

function base(
  row: RawVocabularyImportRow,
  detectedType: ImportDetectedType,
  frenchWord: string,
  englishMeaning: string,
) {
  return {
    rowNumber: row.rowNumber,
    detectedType,
    frenchWord,
    englishMeaning,
    frenchExample: normalizeNullable(row.frenchExample),
    englishExampleTranslation: normalizeNullable(row.englishExampleTranslation),
    cefrLevel: normalizeCefr(row.cefrLevel, frenchWord),
    topic: normalizeTopic(row.topic ?? row.sheetName),
    examType: "BOTH",
    frequencyScore: 60,
    tags: ["excel-import"],
    raw: row,
  };
}

function invalid(row: RawVocabularyImportRow, reason: string): ClassifiedVocabularyRow {
  return {
    ...base(row, "invalid", "", ""),
    shouldImportAsFlashcard: false,
    confidence: 0.99,
    reason,
    needsAiCleanup: false,
  };
}

function skip(
  row: RawVocabularyImportRow,
  detectedType: ImportDetectedType,
  frenchWord: string,
  englishMeaning: string,
  reason: string,
  confidence: number,
): ClassifiedVocabularyRow {
  return {
    ...base(row, detectedType, frenchWord, englishMeaning),
    shouldImportAsFlashcard: false,
    confidence,
    reason,
    needsAiCleanup: false,
  };
}

function firstMeaningfulCell(cells: string[]) {
  return cells.map((cell) => cell.trim()).find(Boolean) ?? "";
}

function inferMeaningFromCells(cells: string[], frenchWord: string) {
  return cells.map((cell) => cell.trim()).find((cell) => cell && cell !== frenchWord) ?? "";
}

function cleanTerm(value: string) {
  return value
    .replace(/^\s*\d+[\).:-]\s*/, "")
    .replace(/[•●◆★⭐️]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMeaning(value: string) {
  return value.replace(/\([^)]*schedule[^)]*\)/i, "").replace(/\s+/g, " ").trim();
}

function isStudySchedule(value: string) {
  return /study schedule|review|anki|flashcards|minutes|day\s*\d+|week\s*\d+|practice\s+plan/i.test(value) &&
    /grammar|vocabulary|listening|reading|writing|speaking|review|schedule/i.test(value);
}

function mostlyNumbers(value: string) {
  const digits = value.replace(/\D/g, "").length;
  return digits > 0 && digits >= value.replace(/\s/g, "").length * 0.55;
}

function looksLikeHeadingSentence(value: string) {
  return value.length > 70 && !/[?.!]$/.test(value) && /^[A-Z0-9]/.test(value);
}

function looksExampleOnly(frenchWord: string, englishMeaning: string) {
  return frenchWord.split(/\s+/).length > 10 && englishMeaning.split(/\s+/).length > 10;
}

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCefr(value: string | undefined, frenchWord: string) {
  const upper = value?.trim().toUpperCase().replace(/[+\s-]/g, "_");
  if (upper === "B1_") return "B1+";
  if (["A1", "A2", "B1", "B1+", "B2"].includes(value?.trim().toUpperCase() ?? "")) {
    return value?.trim().toUpperCase() ?? "B1";
  }
  if (frenchWord.length > 18 || frenchWord.includes(" ")) return "B1+";
  return "B1";
}

function normalizeTopic(value: string | undefined) {
  const upper = value?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_") ?? "";
  if (upper.includes("WORK") || upper.includes("EMPLOI")) return "WORK";
  if (upper.includes("HOUSE") || upper.includes("HOUSING") || upper.includes("LOGEMENT")) return "HOUSING";
  if (upper.includes("HEALTH") || upper.includes("SANTE")) return "HEALTH";
  if (upper.includes("FINANCE") || upper.includes("BANK")) return "FINANCE";
  if (upper.includes("ADMIN")) return "ADMIN";
  if (upper.includes("EDUCATION") || upper.includes("STUDY")) return "EDUCATION";
  if (upper.includes("IMMIGRATION")) return "IMMIGRATION";
  if (upper.includes("OPINION")) return "OPINION";
  if (upper.includes("GRAMMAR")) return "GRAMMAR";
  return "DAILY_LIFE";
}

function inferFrequencyScore(type: ImportDetectedType, level: string, tags: string[]) {
  if (type === "connector") return 94;
  if (tags.includes("listening-trap")) return 88;
  if (type === "phrase") return 84;
  if (level === "B2" || level === "B1+") return 82;
  return 76;
}
