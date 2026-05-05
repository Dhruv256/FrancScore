import { z } from "zod";
import type { AdminResource } from "@/lib/admin/types";

const cefrSchema = z.enum([
  "A1",
  "A2",
  "B1_MINUS",
  "B1",
  "B1_PLUS",
  "B2_MINUS",
  "B2",
  "B2_PLUS",
  "C1",
]);

const examScopeSchema = z.enum(["TEF_CANADA", "TCF_CANADA", "MIXED", "BOTH"]);
const examTypeSchema = z.enum(["TEF_CANADA", "TCF_CANADA", "MIXED"]);
const skillSchema = z.enum(["LISTENING", "READING", "WRITING", "SPEAKING", "VOCABULARY"]);
const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
const trapTypeSchema = z.enum([
  "NEGATION",
  "NUMBER_DATE",
  "CONTRAST_MARKER",
  "SYNONYM_TRAP",
  "FALSE_FRIEND",
  "DOUBLE_NEGATIVE",
  "IMPLICIT_MEANING",
]);
const topicSchema = z.enum([
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
]);
const writingTypeSchema = z.enum(["FORMAL_LETTER", "ESSAY", "EMAIL", "REPORT", "OPINION"]);
const speakingTypeSchema = z.enum(["MONOLOGUE", "DIALOGUE", "DESCRIPTION", "OPINION", "DEBATE"]);
const badgeCategorySchema = z.enum([
  "LISTENING",
  "READING",
  "WRITING",
  "SPEAKING",
  "VOCABULARY",
  "MOCK_TEST",
  "STREAK",
  "MASTERY",
]);

const idSchema = z.string().uuid().optional();
const booleanSchema = z.boolean().default(false);
const stringArrayFromInput = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()));

const jsonFromInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}, z.unknown());

export const passageSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(3),
  content: z.string().trim().min(20),
  cefr_level: cefrSchema,
  exam_type: examScopeSchema,
  topic: topicSchema.nullish().transform((value) => value ?? null),
  word_count: z.coerce.number().int().min(0).optional().nullable(),
  estimated_minutes: z.coerce.number().int().min(0).optional().nullable(),
  highlighted_vocabulary: stringArrayFromInput.default([]),
  is_published: booleanSchema,
});

export const questionSchema = z.object({
  id: idSchema,
  exam_type: examScopeSchema,
  skill_type: skillSchema,
  cefr_level: cefrSchema,
  topic: topicSchema.nullish().transform((value) => value ?? null),
  trap_type: trapTypeSchema.nullish().transform((value) => value ?? null),
  difficulty: difficultySchema,
  option_a: z.string().trim().min(1),
  option_b: z.string().trim().min(1),
  option_c: z.string().trim().min(1),
  option_d: z.string().trim().min(1),
  correct_option: z.coerce.number().int().min(0).max(3),
  question_text: z.string().trim().min(5),
  explanation: z.string().trim().min(3),
  passage_id: z.string().uuid().nullish().transform((value) => value ?? null),
  audio_url: z.string().trim().url().or(z.literal("")).optional().transform((value) => value || null),
  transcript: z.string().trim().optional().transform((value) => value || null),
  tags: stringArrayFromInput.default([]),
  is_published: booleanSchema,
});

export const vocabularySchema = z.object({
  id: idSchema,
  french_word: z.string().trim().min(1),
  english_meaning: z.string().trim().min(1),
  french_example: z.string().trim().optional().transform((value) => value || null),
  english_example_translation: z.string().trim().optional().transform((value) => value || null),
  cefr_level: cefrSchema,
  topic: topicSchema.nullish().transform((value) => value ?? null),
  exam_type: examScopeSchema,
  frequency_score: z.coerce.number().int().min(0).max(1000).default(0),
  tags: stringArrayFromInput.default([]),
  is_published: booleanSchema,
});

export const writingPromptSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(3),
  prompt: z.string().trim().min(20),
  type: writingTypeSchema,
  cefr_level: cefrSchema,
  exam_type: examScopeSchema,
  topic: topicSchema.nullish().transform((value) => value ?? null),
  word_limit_min: z.coerce.number().int().min(0).optional().nullable(),
  word_limit_max: z.coerce.number().int().min(0).optional().nullable(),
  criteria: stringArrayFromInput.default([]),
  sample_response: z.string().trim().optional().transform((value) => value || null),
  is_published: booleanSchema,
});

export const speakingPromptSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(3),
  prompt: z.string().trim().min(20),
  type: speakingTypeSchema,
  cefr_level: cefrSchema,
  exam_type: examScopeSchema,
  topic: topicSchema.nullish().transform((value) => value ?? null),
  duration_seconds: z.coerce.number().int().min(0).optional().nullable(),
  preparation_seconds: z.coerce.number().int().min(0).optional().nullable(),
  criteria: stringArrayFromInput.default([]),
  is_published: booleanSchema,
});

export const badgeSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(2),
  description: z.string().trim().min(3),
  icon: z.string().trim().optional().transform((value) => value || null),
  category: badgeCategorySchema,
  requirement: z.string().trim().optional().transform((value) => value || null),
  xp_reward: z.coerce.number().int().min(0).default(0),
  is_published: booleanSchema,
});

export const mockTestSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(3),
  description: z.string().trim().optional().transform((value) => value || null),
  exam_type: examTypeSchema,
  is_published: booleanSchema,
  sections: jsonFromInput
    .pipe(
      z.array(
        z.object({
          skill_type: skillSchema,
          sort_order: z.coerce.number().int().min(0).default(0),
          question_count: z.coerce.number().int().min(0).default(0),
          duration_minutes: z.coerce.number().int().min(0).default(0),
          metadata: z.record(z.string(), z.unknown()).default({}),
        }),
      ),
    )
    .default([]),
});

export const listeningSchema = z.object({
  id: idSchema,
  question_id: z.string().uuid().optional(),
  question_text: z.string().trim().min(5),
  exam_type: examScopeSchema,
  cefr_level: cefrSchema,
  topic: topicSchema.nullish().transform((value) => value ?? null),
  trap_type: trapTypeSchema.nullish().transform((value) => value ?? null),
  difficulty: difficultySchema,
  option_a: z.string().trim().min(1),
  option_b: z.string().trim().min(1),
  option_c: z.string().trim().min(1),
  option_d: z.string().trim().min(1),
  correct_option: z.coerce.number().int().min(0).max(3),
  explanation: z.string().trim().min(3),
  audio_url: z.string().trim().url().or(z.literal("")).optional().transform((value) => value || null),
  transcript: z.string().trim().optional().transform((value) => value || null),
  tags: stringArrayFromInput.default([]),
  is_published: booleanSchema,
});

export const adminSchemas: Record<AdminResource, z.ZodSchema> = {
  passages: passageSchema,
  listening: listeningSchema,
  questions: questionSchema,
  vocabulary: vocabularySchema,
  "writing-prompts": writingPromptSchema,
  "speaking-prompts": speakingPromptSchema,
  badges: badgeSchema,
  "mock-tests": mockTestSchema,
};

export const adminMutationSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  recordId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
