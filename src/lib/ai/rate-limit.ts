import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import type { Json } from "@/lib/supabase/database.types";

export type AiFeature =
  | "writing_evaluation"
  | "speaking_evaluation"
  | "study_plan"
  | "ai_explanation"
  | "question_generation"
  | "reranking"
  | "safety_check"
  | "speech_to_text";

interface UsageResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
}

export async function checkAiUsage(
  userId: string,
  feature: AiFeature,
  userRole: string,
): Promise<UsageResult> {
  const env = getServerEnv();
  const isPro = userRole === "PRO" || userRole === "ADMIN";
  const windowSeconds = env.AI_RATE_LIMIT_WINDOW_SECONDS;
  const limit = getLimit(feature, isPro, env);
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", windowStart);

  const usedCount = count ?? 0;
  const remaining = Math.max(0, limit - usedCount);
  const resetAt = new Date(Date.now() + windowSeconds * 1000).toISOString();

  return {
    allowed: usedCount < limit,
    remaining,
    limit,
    resetAt,
  };
}

export async function logAiUsage(
  userId: string | null,
  feature: AiFeature,
  metadata?: {
    model?: string | null;
    provider?: string;
    tokensInput?: number | null;
    tokensOutput?: number | null;
    costEstimate?: number | null;
    success?: boolean;
    errorMessage?: string | null;
    metadata?: Record<string, unknown> | null;
    [key: string]: unknown;
  },
): Promise<void> {
  const supabase = createAdminClient();
  const {
    model = null,
    provider = "nvidia",
    tokensInput = null,
    tokensOutput = null,
    costEstimate = null,
    success = true,
    errorMessage = null,
    metadata: nestedMetadata = null,
    ...rest
  } = metadata ?? {};

  await supabase
    .from("ai_usage_logs")
    .insert({
      user_id: userId,
      feature,
      model,
      provider,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_estimate: costEstimate,
      success,
      error_message: errorMessage,
      metadata: (nestedMetadata ?? (Object.keys(rest).length ? rest : null)) as Json,
    })
    .then(({ error }) => {
      if (error) {
        console.error("[AI Usage Log] Failed to record usage:", error.message);
      }
    });
}

function getLimit(
  feature: AiFeature,
  isPro: boolean,
  env: ReturnType<typeof getServerEnv>,
): number {
  switch (feature) {
    case "writing_evaluation":
      return isPro ? env.PRO_DAILY_WRITING_EVALUATIONS : env.FREE_DAILY_WRITING_EVALUATIONS;
    case "speaking_evaluation":
      return isPro ? env.PRO_DAILY_SPEAKING_EVALUATIONS : env.FREE_DAILY_SPEAKING_EVALUATIONS;
    case "study_plan":
      return isPro ? env.PRO_DAILY_STUDY_PLANS : env.FREE_DAILY_STUDY_PLANS;
    case "ai_explanation":
    case "reranking":
    case "safety_check":
    case "speech_to_text":
      return isPro ? env.PRO_DAILY_AI_EXPLANATIONS : env.FREE_DAILY_AI_EXPLANATIONS;
    case "question_generation":
      return 9999;
    default:
      return 0;
  }
}
