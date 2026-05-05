import { z } from "zod";
import { NVIDIA_MODEL_DEFAULTS, nvidiaModelIdSchema } from "@/lib/ai/models";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url().default("https://francscore.app"),
  NEXT_PUBLIC_APP_NAME: z.string().default("FrancScore"),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),

  NVIDIA_MAIN_API_KEY: z.string().min(1).optional(),
  NVIDIA_RERANK_API_KEY: z.string().min(1).optional(),
  NVIDIA_SAFETY_API_KEY: z.string().min(1).optional(),
  NVIDIA_STT_API_KEY: z.string().min(1).optional(),
  NVIDIA_MAIN_MODEL: nvidiaModelIdSchema.default(NVIDIA_MODEL_DEFAULTS.MAIN),
  NVIDIA_RERANK_MODEL: nvidiaModelIdSchema.default(NVIDIA_MODEL_DEFAULTS.RERANKER),
  NVIDIA_SAFETY_MODEL: nvidiaModelIdSchema.default(NVIDIA_MODEL_DEFAULTS.SAFETY),
  NVIDIA_STT_MODEL: nvidiaModelIdSchema.default(NVIDIA_MODEL_DEFAULTS.SPEECH_TO_TEXT),
  NVIDIA_BUILD_API_BASE_URL: z.url().default("https://integrate.api.nvidia.com"),
  NVIDIA_BUILD_API_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).default(30000),

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
});

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;
type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;

function formatEnvError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!parsed.success) {
    throw new Error(`Invalid public environment variables: ${formatEnvError(parsed.error)}`);
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NVIDIA_MAIN_API_KEY: process.env.NVIDIA_MAIN_API_KEY,
    NVIDIA_RERANK_API_KEY: process.env.NVIDIA_RERANK_API_KEY,
    NVIDIA_SAFETY_API_KEY: process.env.NVIDIA_SAFETY_API_KEY,
    NVIDIA_STT_API_KEY: process.env.NVIDIA_STT_API_KEY,
    NVIDIA_MAIN_MODEL: process.env.NVIDIA_MAIN_MODEL,
    NVIDIA_RERANK_MODEL: process.env.NVIDIA_RERANK_MODEL,
    NVIDIA_SAFETY_MODEL: process.env.NVIDIA_SAFETY_MODEL,
    NVIDIA_STT_MODEL: process.env.NVIDIA_STT_MODEL,
    NVIDIA_BUILD_API_BASE_URL: process.env.NVIDIA_BUILD_API_BASE_URL,
    NVIDIA_BUILD_API_TIMEOUT_MS: process.env.NVIDIA_BUILD_API_TIMEOUT_MS,
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
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment variables: ${formatEnvError(parsed.error)}`);
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
    throw new Error(`Invalid database environment variables: ${formatEnvError(parsed.error)}`);
  }

  return parsed.data;
}
