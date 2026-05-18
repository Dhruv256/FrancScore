import "server-only";

import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env/server";

export const PDF_BOOK_FEATURE_DISABLED_RESPONSE = {
  ok: false,
  code: "PDF_BOOK_FEATURE_DISABLED",
  message: "PDF Book Import is disabled on this server.",
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
      message: "AI_VOCAB_GENERATION_ENABLED is not set to true on the server.",
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
    message: `Ready to generate ${env.DAILY_AI_VOCAB_COUNT} TEF/TCF flashcards.`,
    requestedCount: env.DAILY_AI_VOCAB_COUNT,
    model: env.NVIDIA_MAIN_MODEL,
  } as const;
}
