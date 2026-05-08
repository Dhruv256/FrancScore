import "server-only";

import { z } from "zod";
import { nvidiaModelIdSchema } from "@/lib/ai/models";
import {
  booleanFlagSchema,
  formatEnvError,
  optionalBooleanFlagSchema,
  optionalStringSchema,
} from "@/lib/env/shared";

const serverEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .min(1, "SUPABASE_SERVICE_ROLE_KEY is required."),
    DATABASE_URL: optionalStringSchema,
    DIRECT_URL: optionalStringSchema,

    NVIDIA_API_KEY: optionalStringSchema,
    NVIDIA_API_BASE_URL: z
      .url("NVIDIA_API_BASE_URL must be a valid URL.")
      .default("https://integrate.api.nvidia.com"),
    NVIDIA_AI_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).default(45000),
    NVIDIA_MAIN_MODEL: nvidiaModelIdSchema.default("meta/llama-3.1-70b-instruct"),
    NVIDIA_IMPORT_CLEANUP_MODEL: nvidiaModelIdSchema.optional(),
    NVIDIA_RERANK_MODEL: nvidiaModelIdSchema.default("nvidia/nv-rerankqa-mistral-4b-v3"),
    NVIDIA_SAFETY_MODEL: nvidiaModelIdSchema.default("meta/llama-3.1-8b-instruct"),
    NVIDIA_STT_MODEL: nvidiaModelIdSchema.default("nvidia/parakeet-ctc-1.1b"),
    NVIDIA_MAIN_API_KEY: optionalStringSchema,
    NVIDIA_RERANK_API_KEY: optionalStringSchema,
    NVIDIA_SAFETY_API_KEY: optionalStringSchema,
    NVIDIA_STT_API_KEY: optionalStringSchema,

    AI_ENABLE_WRITING_EVALUATION: booleanFlagSchema.default(false),
    AI_ENABLE_SPEAKING_EVALUATION: booleanFlagSchema.default(false),
    AI_ENABLE_STUDY_PLAN: booleanFlagSchema.default(false),
    AI_ENABLE_ADMIN_GENERATION: booleanFlagSchema.default(false),
    AI_ENABLE_RERANKING: booleanFlagSchema.default(false),
    AI_ENABLE_SAFETY_CHECK: booleanFlagSchema.default(false),
    AI_ENABLE_STT: booleanFlagSchema.default(false),

    FREE_DAILY_WRITING_EVALUATIONS: z.coerce.number().int().positive().default(1),
    FREE_DAILY_SPEAKING_EVALUATIONS: z.coerce.number().int().positive().default(1),
    FREE_DAILY_STUDY_PLANS: z.coerce.number().int().positive().default(1),
    FREE_DAILY_AI_EXPLANATIONS: z.coerce.number().int().positive().default(5),
    PRO_DAILY_WRITING_EVALUATIONS: z.coerce.number().int().positive().default(50),
    PRO_DAILY_SPEAKING_EVALUATIONS: z.coerce.number().int().positive().default(50),
    PRO_DAILY_STUDY_PLANS: z.coerce.number().int().positive().default(10),
    PRO_DAILY_AI_EXPLANATIONS: z.coerce.number().int().positive().default(200),
    AI_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(86400),
    AI_RATE_LIMIT_FREE_DAILY: z.coerce.number().int().positive().default(10),
    AI_RATE_LIMIT_PRO_DAILY: z.coerce.number().int().positive().default(200),

    SUPABASE_LISTENING_AUDIO_BUCKET: z.string().min(1).default("listening-audio"),
    SUPABASE_SPEAKING_AUDIO_BUCKET: z.string().min(1).default("speaking-audio"),
    SUPABASE_USER_UPLOADS_BUCKET: z.string().min(1).default("user-uploads"),

    SESSION_SECRET: optionalStringSchema,
    ADMIN_EMAILS: z.string().optional(),
    ALLOWED_EMAIL_DOMAINS: z.string().optional(),
    PAYMENTS_ENABLED: optionalBooleanFlagSchema,
    RAZORPAY_KEY_ID: optionalStringSchema,
    RAZORPAY_KEY_SECRET: optionalStringSchema,
    RAZORPAY_WEBHOOK_SECRET: optionalStringSchema,
    STRIPE_SECRET_KEY: optionalStringSchema,
    STRIPE_WEBHOOK_SECRET: optionalStringSchema,
    EMAIL_ENABLED: optionalBooleanFlagSchema,
    EMAIL_FROM: z.string().optional(),
    AWS_ACCESS_KEY_ID: optionalStringSchema,
    AWS_SECRET_ACCESS_KEY: optionalStringSchema,
    AWS_REGION: z.string().optional(),
    FRANCSCORE_E2E_TEST_MODE: optionalBooleanFlagSchema,
  });

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required."),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

function readServerEnvInput() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
    NVIDIA_API_BASE_URL: process.env.NVIDIA_API_BASE_URL,
    NVIDIA_AI_TIMEOUT_MS: process.env.NVIDIA_AI_TIMEOUT_MS,
    NVIDIA_MAIN_MODEL: process.env.NVIDIA_MAIN_MODEL,
    NVIDIA_IMPORT_CLEANUP_MODEL: process.env.NVIDIA_IMPORT_CLEANUP_MODEL,
    NVIDIA_RERANK_MODEL: process.env.NVIDIA_RERANK_MODEL,
    NVIDIA_SAFETY_MODEL: process.env.NVIDIA_SAFETY_MODEL,
    NVIDIA_STT_MODEL: process.env.NVIDIA_STT_MODEL,
    NVIDIA_MAIN_API_KEY: process.env.NVIDIA_MAIN_API_KEY,
    NVIDIA_RERANK_API_KEY: process.env.NVIDIA_RERANK_API_KEY,
    NVIDIA_SAFETY_API_KEY: process.env.NVIDIA_SAFETY_API_KEY,
    NVIDIA_STT_API_KEY: process.env.NVIDIA_STT_API_KEY,
    AI_ENABLE_WRITING_EVALUATION: process.env.AI_ENABLE_WRITING_EVALUATION,
    AI_ENABLE_SPEAKING_EVALUATION: process.env.AI_ENABLE_SPEAKING_EVALUATION,
    AI_ENABLE_STUDY_PLAN: process.env.AI_ENABLE_STUDY_PLAN,
    AI_ENABLE_ADMIN_GENERATION: process.env.AI_ENABLE_ADMIN_GENERATION,
    AI_ENABLE_RERANKING: process.env.AI_ENABLE_RERANKING,
    AI_ENABLE_SAFETY_CHECK: process.env.AI_ENABLE_SAFETY_CHECK,
    AI_ENABLE_STT: process.env.AI_ENABLE_STT,
    FREE_DAILY_WRITING_EVALUATIONS: process.env.FREE_DAILY_WRITING_EVALUATIONS,
    FREE_DAILY_SPEAKING_EVALUATIONS: process.env.FREE_DAILY_SPEAKING_EVALUATIONS,
    FREE_DAILY_STUDY_PLANS: process.env.FREE_DAILY_STUDY_PLANS,
    FREE_DAILY_AI_EXPLANATIONS: process.env.FREE_DAILY_AI_EXPLANATIONS,
    PRO_DAILY_WRITING_EVALUATIONS: process.env.PRO_DAILY_WRITING_EVALUATIONS,
    PRO_DAILY_SPEAKING_EVALUATIONS: process.env.PRO_DAILY_SPEAKING_EVALUATIONS,
    PRO_DAILY_STUDY_PLANS: process.env.PRO_DAILY_STUDY_PLANS,
    PRO_DAILY_AI_EXPLANATIONS: process.env.PRO_DAILY_AI_EXPLANATIONS,
    AI_RATE_LIMIT_WINDOW_SECONDS: process.env.AI_RATE_LIMIT_WINDOW_SECONDS,
    AI_RATE_LIMIT_FREE_DAILY: process.env.AI_RATE_LIMIT_FREE_DAILY,
    AI_RATE_LIMIT_PRO_DAILY: process.env.AI_RATE_LIMIT_PRO_DAILY,
    SUPABASE_LISTENING_AUDIO_BUCKET: process.env.SUPABASE_LISTENING_AUDIO_BUCKET,
    SUPABASE_SPEAKING_AUDIO_BUCKET: process.env.SUPABASE_SPEAKING_AUDIO_BUCKET,
    SUPABASE_USER_UPLOADS_BUCKET: process.env.SUPABASE_USER_UPLOADS_BUCKET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS,
    PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    EMAIL_ENABLED: process.env.EMAIL_ENABLED,
    EMAIL_FROM: process.env.EMAIL_FROM,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    FRANCSCORE_E2E_TEST_MODE: process.env.FRANCSCORE_E2E_TEST_MODE,
  };
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.safeParse(readServerEnvInput());

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables: ${formatEnvError(parsed.error)}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function getDatabaseEnv(): DatabaseEnv {
  const parsed = databaseEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid database environment variables: ${formatEnvError(parsed.error)}`,
    );
  }

  return parsed.data;
}

export function isE2ETestModeEnabled(): boolean {
  const parsed = optionalBooleanFlagSchema.safeParse(process.env.FRANCSCORE_E2E_TEST_MODE);
  return parsed.success ? parsed.data ?? false : false;
}
