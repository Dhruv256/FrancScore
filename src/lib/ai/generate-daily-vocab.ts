import "server-only";

import { z } from "zod";
import { generateStructuredObject, NvidiaAIError } from "@/lib/ai/nvidia-client";
import { getServerEnv } from "@/lib/env/server";
import { hasBadExample, normalizeVocabularyKey } from "@/lib/import/classify-vocab-row";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const aiVocabItemSchema = z.object({
  french_word: z.string().min(1),
  english_meaning: z.string().min(1),
  french_example: z.string().min(1),
  english_example_translation: z.string().min(1),
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
  frequency_score: z.number().int().min(1).max(100),
  tags: z.array(z.string()).default([]),
});

const aiVocabResponseSchema = z.object({
  items: z.array(aiVocabItemSchema),
});

type AiVocabItem = z.infer<typeof aiVocabItemSchema>;
type VocabularyInsert = Database["public"]["Tables"]["vocabulary"]["Insert"];

const BAD_TERM_PATTERNS = [
  /^\s*day\s+\d+\s*$/i,
  /^\s*part\s+\d+\s*$/i,
  /^\s*concepts?\s*$/i,
  /^\s*mini\s*$/i,
  /^\s*vocabulary\s*$/i,
  /^\s*\d+\s*[-–—]\s*\d+\s*$/i,
  /^\s*french study schedule\s*$/i,
];

export type DailyVocabGenerationSummary = {
  generationId: string;
  generationDate: string;
  modelUsed: string | null;
  requestedCount: number;
  insertedCount: number;
  skippedDuplicateCount: number;
  failedCount: number;
  status: "completed" | "failed" | "already_completed";
  message: string;
};

export async function generateDailyVocabularyBatch(): Promise<DailyVocabGenerationSummary> {
  const env = getServerEnv();

  if (!env.AI_VOCAB_GENERATION_ENABLED) {
    throw new Error(
      "Daily AI vocabulary generation is disabled. Set AI_VOCAB_GENERATION_ENABLED=true on the server.",
    );
  }

  const supabase = createAdminClient();
  const generationDate = new Date().toISOString().slice(0, 10);
  const requestedCount = env.DAILY_AI_VOCAB_COUNT;

  const { data: existingGeneration, error: existingError } = await supabase
    .from("daily_vocab_generations")
    .select("*")
    .eq("generation_date", generationDate)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingGeneration?.status === "completed") {
    return {
      generationId: existingGeneration.id,
      generationDate,
      modelUsed: existingGeneration.model_used,
      requestedCount: existingGeneration.requested_count,
      insertedCount: existingGeneration.inserted_count,
      skippedDuplicateCount: existingGeneration.skipped_duplicate_count,
      failedCount: existingGeneration.failed_count,
      status: "already_completed",
      message: "Today's 50 AI vocabulary words have already been generated.",
    };
  }

  const generationId = existingGeneration?.id ?? crypto.randomUUID();
  const { error: upsertError } = await supabase.from("daily_vocab_generations").upsert(
    {
      id: generationId,
      generation_date: generationDate,
      requested_count: requestedCount,
      status: "pending",
      inserted_count: 0,
      skipped_duplicate_count: 0,
      failed_count: 0,
      error_message: null,
      completed_at: null,
    },
    { onConflict: "generation_date" },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  try {
    const { existingKeys, existingTermsForPrompt } = await loadExistingVocabularyKeys();
    const primaryModel = env.NVIDIA_VOCAB_GENERATION_MODEL ?? env.NVIDIA_MAIN_MODEL;
    const fallbackModel = env.NVIDIA_VOCAB_FALLBACK_MODEL ?? env.NVIDIA_MAIN_MODEL;
    let modelUsed = primaryModel;
    let generatedItems: AiVocabItem[] = [];

    try {
      generatedItems = await requestVocabularyItems({
        count: requestedCount,
        model: primaryModel,
        excludedTerms: existingTermsForPrompt,
      });
    } catch (error) {
      if (!(error instanceof NvidiaAIError)) {
        throw error;
      }
      modelUsed = fallbackModel;
      generatedItems = await requestVocabularyItems({
        count: requestedCount,
        model: fallbackModel,
        excludedTerms: existingTermsForPrompt,
      });
    }

    let cleaned = cleanGeneratedItems(generatedItems, existingKeys);
    const missingCount = requestedCount - cleaned.valid.length;

    if (missingCount > 0) {
      const retryItems = await requestVocabularyItems({
        count: missingCount,
        model: modelUsed,
        excludedTerms: [
          ...existingTermsForPrompt,
          ...cleaned.valid.map((item) => item.french_word),
        ].slice(-600),
        retryInstructions:
          "The first response contained duplicates or invalid rows. Return only fresh, flashcard-worthy rows for the missing count.",
      });
      cleaned = mergeCleanedResults(cleaned, cleanGeneratedItems(retryItems, existingKeys));
    }

    const rows = cleaned.valid.slice(0, requestedCount).map((item) =>
      mapAiItemToVocabularyInsert(item, generationId),
    );

    const { error: insertError } = rows.length
      ? await supabase.from("vocabulary").insert(rows)
      : { error: null };

    if (insertError) {
      throw new Error(insertError.message);
    }

    const insertedCount = rows.length;
    const failedCount = Math.max(0, requestedCount - insertedCount - cleaned.duplicates);
    await supabase
      .from("daily_vocab_generations")
      .update({
        status: "completed",
        model_used: modelUsed,
        inserted_count: insertedCount,
        skipped_duplicate_count: cleaned.duplicates,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationId);

    return {
      generationId,
      generationDate,
      modelUsed,
      requestedCount,
      insertedCount,
      skippedDuplicateCount: cleaned.duplicates,
      failedCount,
      status: "completed",
      message: `Generated ${insertedCount} published AI vocabulary words for today.`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Daily vocabulary generation failed.";
    await supabase
      .from("daily_vocab_generations")
      .update({
        status: "failed",
        error_message: errorMessage.slice(0, 1000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationId);
    throw error;
  }
}

async function requestVocabularyItems(input: {
  count: number;
  model: string;
  excludedTerms: string[];
  retryInstructions?: string;
}) {
  const result = await generateStructuredObject({
    purpose: "VOCAB_GENERATION",
    model: input.model,
    schema: aiVocabResponseSchema,
    temperature: 0.35,
    maxTokens: Math.min(9000, 900 + input.count * 150),
    messages: [
      {
        role: "system",
        content:
          "You generate original TEF Canada and TCF Canada French vocabulary flashcards. Return strict JSON only.",
      },
      {
        role: "user",
        content: [
          `Generate exactly ${input.count} useful French vocabulary items or phrases.`,
          "Return JSON with shape: {\"items\":[{\"french_word\":\"\",\"english_meaning\":\"\",\"french_example\":\"\",\"english_example_translation\":\"\",\"cefr_level\":\"B1\",\"topic\":\"daily_life\",\"exam_type\":\"BOTH\",\"frequency_score\":80,\"tags\":[\"high-frequency\"]}]}",
          "",
          "Rules:",
          "- Focus on practical B1/B2 TEF/TCF Canada utility.",
          "- Mix connectors, daily life, administration, work, housing, health, education, immigration, opinion vocabulary, listening traps, and useful phrases.",
          "- Do not return headings, day labels, parts, lesson titles, grammar concepts, rare words, or fake words.",
          "- Examples must be natural, short, and exam-useful.",
          "- English translation must directly translate the French example.",
          "- Tags should be lowercase, concise, and useful for deck filters.",
          "- Return only JSON.",
          input.retryInstructions ?? "",
          "",
          "Already in the database; avoid these:",
          input.excludedTerms.slice(-500).join(", "),
        ].join("\n"),
      },
    ],
  });

  return result.items;
}

async function loadExistingVocabularyKeys() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vocabulary")
    .select("french_word, english_meaning")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  const terms = (data ?? []).map((row) => row.french_word).filter(Boolean);
  return {
    existingKeys: new Set(terms.map(normalizeVocabularyKey)),
    existingTermsForPrompt: terms.slice(0, 500),
  };
}

function cleanGeneratedItems(items: AiVocabItem[], existingKeys: Set<string>) {
  const seen = new Set<string>();
  const valid: AiVocabItem[] = [];
  let duplicates = 0;

  for (const item of items) {
    const key = normalizeVocabularyKey(item.french_word);
    const term = item.french_word.trim();

    if (!key || existingKeys.has(key) || seen.has(key)) {
      duplicates += 1;
      continue;
    }

    if (
      BAD_TERM_PATTERNS.some((pattern) => pattern.test(term)) ||
      hasBadExample(item.french_example, item.english_example_translation)
    ) {
      continue;
    }

    seen.add(key);
    valid.push(item);
  }

  return { valid, duplicates };
}

function mergeCleanedResults(
  first: ReturnType<typeof cleanGeneratedItems>,
  second: ReturnType<typeof cleanGeneratedItems>,
) {
  const seen = new Set(first.valid.map((item) => normalizeVocabularyKey(item.french_word)));
  const valid = [...first.valid];
  let duplicates = first.duplicates + second.duplicates;

  for (const item of second.valid) {
    const key = normalizeVocabularyKey(item.french_word);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    valid.push(item);
  }

  return { valid, duplicates };
}

function mapAiItemToVocabularyInsert(item: AiVocabItem, generationId: string): VocabularyInsert {
  return {
    french_word: item.french_word.trim(),
    english_meaning: item.english_meaning.trim(),
    french_example: item.french_example.trim(),
    english_example_translation: item.english_example_translation.trim(),
    cefr_level: item.cefr_level === "B1+" ? "B1_PLUS" : item.cefr_level,
    topic: normalizeAiTopic(item.topic),
    exam_type: normalizeAiExamType(item.exam_type),
    frequency_score: item.frequency_score,
    tags: [
      ...new Set(
        ["ai-generated", "daily-ai", `daily-generation:${generationId}`, ...item.tags]
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
    source_import_id: null,
    import_confidence: 0.92,
    is_published: true,
  };
}

function normalizeAiTopic(topic: AiVocabItem["topic"]) {
  const map: Record<AiVocabItem["topic"], string> = {
    daily_life: "DAILY_LIFE",
    work: "WORK",
    housing: "HOUSING",
    health: "HEALTH",
    finance: "ADMINISTRATION",
    admin: "ADMINISTRATION",
    education: "EDUCATION",
    immigration: "IMMIGRATION",
    opinion: "OPINION",
    grammar: "EDUCATION",
  };
  return map[topic];
}

function normalizeAiExamType(examType: AiVocabItem["exam_type"]) {
  if (examType === "TEF") return "TEF_CANADA";
  if (examType === "TCF") return "TCF_CANADA";
  return "BOTH";
}
