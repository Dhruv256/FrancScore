import { z } from "zod";

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

const examTypeSchema = z.enum(["TEF_CANADA", "TCF_CANADA", "MIXED"]);
const skillSchema = z.enum(["LISTENING", "READING", "WRITING", "SPEAKING", "VOCABULARY"]);
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
const trapTypeSchema = z.enum([
  "NEGATION",
  "NUMBER_DATE",
  "CONTRAST_MARKER",
  "SYNONYM_TRAP",
  "FALSE_FRIEND",
  "DOUBLE_NEGATIVE",
  "IMPLICIT_MEANING",
]);

export const writingEvaluationSchema = z.object({
  estimated_cefr: cefrSchema,
  score_20: z.number().int().min(0).max(20),
  task_completion: z.number().min(0).max(100),
  grammar_score: z.number().min(0).max(100),
  vocabulary_score: z.number().min(0).max(100),
  structure_score: z.number().min(0).max(100),
  errors: z.array(
    z.object({
      type: z.enum(["grammar", "vocabulary", "structure", "task_relevance"]),
      original: z.string(),
      correction: z.string(),
      explanation: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  b2_rewrite: z.string(),
  next_drill: z.string(),
});

export const speakingEvaluationSchema = z.object({
  estimated_cefr: cefrSchema,
  score_20: z.number().int().min(0).max(20),
  fluency_score: z.number().min(0).max(100),
  grammar_score: z.number().min(0).max(100),
  vocabulary_score: z.number().min(0).max(100),
  structure_score: z.number().min(0).max(100),
  task_relevance_score: z.number().min(0).max(100),
  feedback: z.string(),
  repeated_words: z.array(z.string()),
  better_phrases: z.array(z.string()),
  next_drill: z.string(),
});

export const studyPlanRequestSchema = z.object({
  days: z.number().int().min(3).max(14).default(7),
  focusSkills: z.array(skillSchema).max(5).optional(),
});

export const studyPlanResponseSchema = z.object({
  summary: z.string(),
  focus_areas: z.array(z.string()),
  daily_plan: z.array(
    z.object({
      day: z.number().int().min(1),
      title: z.string(),
      minutes: z.number().int().min(10).max(180),
      tasks: z.array(z.string()).min(1).max(5),
    }),
  ),
});

export const generateQuestionRequestSchema = z.object({
  skill: z.enum(["LISTENING", "READING"]),
  exam_type: examTypeSchema,
  cefr_level: cefrSchema,
  topic: topicSchema,
  trap_type: trapTypeSchema.optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  prompt_seed: z.string().trim().min(10).max(2000).optional(),
  persist_draft: z.boolean().default(false),
});

export const generateQuestionResponseSchema = z.object({
  passage: z
    .object({
      title: z.string(),
      content: z.string(),
      estimated_minutes: z.number().int().min(1).max(20),
      topic: topicSchema,
      cefr_level: cefrSchema,
      exam_type: examTypeSchema,
    })
    .nullable(),
  question: z.object({
    question_text: z.string(),
    options: z.array(z.string()).length(4),
    correct_answer_index: z.number().int().min(0).max(3),
    explanation: z.string(),
    skill_type: z.enum(["LISTENING", "READING"]),
    exam_type: examTypeSchema,
    cefr_level: cefrSchema,
    topic: topicSchema,
    trap_type: trapTypeSchema.nullable(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    transcript: z.string().nullable(),
    audio_url: z.string().nullable(),
  }),
});

export const writingEvaluateRequestSchema = z
  .object({
    submission_id: z.string().uuid().optional(),
    prompt_id: z.string().uuid().optional(),
    submission_text: z.string().trim().min(20).max(10000).optional(),
  })
  .refine((value) => Boolean(value.submission_id || (value.prompt_id && value.submission_text)), {
    message: "Provide either submission_id or both prompt_id and submission_text.",
    path: ["submission_id"],
  });

export const speakingEvaluateRequestSchema = z
  .object({
    submission_id: z.string().uuid().optional(),
    prompt_id: z.string().uuid().optional(),
    transcript: z.string().trim().min(20).max(12000).optional(),
    audio_path: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.submission_id || (value.prompt_id && (value.transcript || value.audio_path))),
    {
      message: "Provide either submission_id or a prompt_id with transcript/audio_path.",
      path: ["submission_id"],
    },
  );

export type WritingEvaluation = z.infer<typeof writingEvaluationSchema>;
export type SpeakingEvaluation = z.infer<typeof speakingEvaluationSchema>;
export type StudyPlanRequest = z.infer<typeof studyPlanRequestSchema>;
export type StudyPlanResponse = z.infer<typeof studyPlanResponseSchema>;
export type GenerateQuestionRequest = z.infer<typeof generateQuestionRequestSchema>;
export type GenerateQuestionResponse = z.infer<typeof generateQuestionResponseSchema>;
