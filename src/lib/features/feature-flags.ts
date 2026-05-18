import "server-only";

import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env/server";

export const PDF_BOOK_FEATURE_DISABLED_RESPONSE = {
  ok: false,
  code: "PDF_BOOK_FEATURE_DISABLED",
  message:
    "PDF Book Import is temporarily disabled. This feature will be rebuilt and imported from scratch later.",
} as const;

export function isPdfBookFeatureEnabled() {
  try {
    return getServerEnv().PDF_BOOK_FEATURE_ENABLED;
  } catch {
    return false;
  }
}

export function pdfBookFeatureDisabledJson() {
  return NextResponse.json(PDF_BOOK_FEATURE_DISABLED_RESPONSE, { status: 503 });
}

export function getDailyVocabReadiness() {
  const env = getServerEnv();

  if (!env.AI_VOCAB_GENERATION_ENABLED) {
    return {
      enabled: false,
      code: "AI_VOCAB_GENERATION_DISABLED",
      message: "Daily AI vocabulary generation is disabled on this server.",
      requestedCount: env.DAILY_AI_VOCAB_COUNT,
      model: env.NVIDIA_MAIN_MODEL,
    } as const;
  }

  if (!env.NVIDIA_MAIN_API_KEY) {
    return {
      enabled: false,
      code: "NVIDIA_MAIN_API_KEY_MISSING",
      message: "NVIDIA_MAIN_API_KEY is missing on the server.",
      requestedCount: env.DAILY_AI_VOCAB_COUNT,
      model: env.NVIDIA_MAIN_MODEL,
    } as const;
  }

  return {
    enabled: true,
    code: "READY",
    message: "Daily AI vocabulary generation is ready.",
    requestedCount: env.DAILY_AI_VOCAB_COUNT,
    model: env.NVIDIA_MAIN_MODEL,
  } as const;
}
