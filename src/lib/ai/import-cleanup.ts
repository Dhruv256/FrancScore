import { z } from "zod";
import type { ClassifiedVocabularyRow } from "@/lib/import/classify-vocab-row";

const cleanedImportItemSchema = z.object({
  row_number: z.number().int(),
  detected_type: z.enum([
    "vocabulary_word",
    "phrase",
    "connector",
    "grammar_concept",
    "section_heading",
    "study_schedule",
    "invalid",
  ]),
  should_import_as_flashcard: z.boolean(),
  french_word: z.string(),
  english_meaning: z.string(),
  french_example: z.string(),
  english_example_translation: z.string(),
  cefr_level: z.enum(["A1", "A2", "B1", "B1+", "B2"]),
  topic: z.enum([
    "daily_life",
    "work",
    "housing",
    "health",
    "finance",
    "admin",
    "education",
    "immigration",
    "opinion",
    "grammar",
  ]),
  exam_type: z.enum(["TEF", "TCF", "BOTH"]),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

const cleanupResponseSchema = z.object({
  items: z.array(cleanedImportItemSchema),
});

export type CleanedImportItem = z.infer<typeof cleanedImportItemSchema>;

export async function cleanupVocabularyRowsWithAI(rows: ClassifiedVocabularyRow[]) {
  const apiKey = process.env.NVIDIA_MAIN_API_KEY ?? process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_IMPORT_CLEANUP_MODEL ?? process.env.NVIDIA_MAIN_MODEL;
  const baseUrl = process.env.NVIDIA_API_BASE_URL ?? "https://integrate.api.nvidia.com";

  if (!rows.length || !apiKey || !model) {
    return [];
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 2600,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You clean mixed French Excel imports for a private TEF/TCF study app. Return strict JSON only.",
        },
        {
          role: "user",
          content: buildCleanupPrompt(rows),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`NVIDIA import cleanup failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | Array<unknown> } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  const rawText = Array.isArray(content)
    ? content.map((part) => (typeof part === "string" ? part : "")).join("")
    : content;

  if (!rawText) {
    throw new Error("NVIDIA import cleanup returned an empty response.");
  }

  const parsed = cleanupResponseSchema.safeParse(JSON.parse(extractJson(rawText)));
  if (!parsed.success) {
    throw new Error(`NVIDIA import cleanup returned invalid JSON: ${parsed.error.issues[0]?.message}`);
  }

  return parsed.data.items;
}

function buildCleanupPrompt(rows: ClassifiedVocabularyRow[]) {
  return [
    "Classify and clean these rows. Rules:",
    "- Do not import headings, day labels, lesson titles, ranges, or study schedule rows.",
    "- Do not import grammar concepts as flashcards.",
    "- Import only useful vocabulary words, phrases, and connectors.",
    "- Replace generic examples like “Dans un contexte d’examen...” with short natural B1/B2 French examples.",
    "- English translation must directly translate the French example.",
    "- Do not invent rare words.",
    "- Return only JSON in this exact shape:",
    '{"items":[{"row_number":12,"detected_type":"vocabulary_word","should_import_as_flashcard":true,"french_word":"","english_meaning":"","french_example":"","english_example_translation":"","cefr_level":"B1","topic":"daily_life","exam_type":"BOTH","tags":[],"confidence":0.9,"reason":""}]}',
    "",
    JSON.stringify(
      rows.map((row) => ({
        row_number: row.rowNumber,
        heuristic_type: row.detectedType,
        french_word: row.frenchWord,
        english_meaning: row.englishMeaning,
        french_example: row.frenchExample,
        english_example_translation: row.englishExampleTranslation,
        raw_cells: row.raw.rawCells,
        reason: row.reason,
      })),
    ),
  ].join("\n");
}

function extractJson(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("AI cleanup response did not contain a JSON object.");
  }

  return candidate.slice(firstBrace, lastBrace + 1);
}
