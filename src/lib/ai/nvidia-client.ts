import "server-only";

import { z } from "zod";
import { getServerEnv } from "@/lib/env/server";
import type { NvidiaModelId, NvidiaModelPurpose } from "@/lib/ai/models";
import { getAIModelCatalog } from "@/lib/constants/ai-models";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const chatCompletionEnvelopeSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.union([z.string(), z.array(z.unknown())]).optional(),
        }),
      }),
    )
    .min(1),
});

const rankingEnvelopeSchema = z.object({
  data: z
    .array(
      z.object({
        index: z.number().int().nonnegative().optional(),
        score: z.number(),
      }),
    )
    .optional(),
  rankings: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        score: z.number(),
      }),
    )
    .optional(),
});

export class NvidiaAIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "CONFIG" | "TIMEOUT" | "UPSTREAM" | "PARSE" | "SAFETY",
  ) {
    super(message);
    this.name = "NvidiaAIError";
  }
}

export function isNvidiaEnabled() {
  return isNvidiaPurposeEnabled("MAIN");
}

export function isNvidiaPurposeEnabled(purpose: NvidiaModelPurpose) {
  const env = getServerEnv();
  return isFeatureEnabledForPurpose(env, purpose);
}

export function getConfiguredModelId(purpose: NvidiaModelPurpose): NvidiaModelId {
  const env = getServerEnv();

  switch (purpose) {
    case "MAIN":
      return env.NVIDIA_MAIN_MODEL;
    case "RERANKER":
      return env.NVIDIA_RERANK_MODEL;
    case "SAFETY":
      return env.NVIDIA_SAFETY_MODEL;
    case "SPEECH_TO_TEXT":
      return env.NVIDIA_STT_MODEL;
    case "IMPORT_CLEANUP":
      return env.NVIDIA_IMPORT_CLEANUP_MODEL ?? env.NVIDIA_MAIN_MODEL;
    case "VOCAB_GENERATION":
      return env.NVIDIA_VOCAB_GENERATION_MODEL ?? env.NVIDIA_MAIN_MODEL;
    case "PDF_PROCESSING":
      return env.NVIDIA_PDF_PROCESSING_MODEL ?? env.NVIDIA_MAIN_MODEL;
    case "LISTENING_SCRIPT":
      return env.NVIDIA_LISTENING_SCRIPT_MODEL ?? env.NVIDIA_MAIN_MODEL;
  }
}

export async function generateStructuredObject<T>(input: {
  purpose?: NvidiaModelPurpose;
  model?: NvidiaModelId;
  schema: z.ZodSchema<T>;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const purpose = input.purpose ?? "MAIN";
  const text = await createChatCompletion({
    purpose,
    model: input.model ?? getConfiguredModelId(purpose),
    messages: input.messages,
    temperature: input.temperature ?? 0.2,
    maxTokens: input.maxTokens ?? 1400,
  });

  const parsed = input.schema.safeParse(extractJson(text));
  if (!parsed.success) {
    throw new NvidiaAIError(
      `The AI response could not be validated: ${parsed.error.issues[0]?.message ?? "invalid JSON"}`,
      502,
      "PARSE",
    );
  }

  return parsed.data;
}

export async function runSafetyCheck(input: {
  userInput: string;
  purpose: string;
}) {
  const schema = z.object({
    allowed: z.boolean(),
    reason: z.string(),
    category: z.string().nullable(),
  });

  const result = await generateStructuredObject({
    purpose: "SAFETY",
    model: getConfiguredModelId("SAFETY"),
    schema,
    temperature: 0,
    maxTokens: 300,
    messages: [
      {
        role: "system",
        content:
          "You are a safety classifier for an educational French exam-prep app. Return JSON only.",
      },
      {
        role: "user",
        content: [
          "Return JSON with shape:",
          '{"allowed":true,"reason":"","category":null}',
          "",
          `Purpose: ${input.purpose}`,
          "Policy:",
          "- Allow normal educational, language-learning, and immigration-exam content.",
          "- Block instructions for harm, fraud, evasion, self-harm, sexual minors, or illegal wrongdoing.",
          "- If unsure but low risk, allow.",
          "",
          "User content:",
          input.userInput,
        ].join("\n"),
      },
    ],
  });

  return result;
}

export async function rerankTexts(input: {
  query: string;
  passages: string[];
}) {
  if (!input.passages.length) {
    return [];
  }

  const response = await nvidiaFetch("/v1/ranking", {
    method: "POST",
    body: JSON.stringify({
      model: getConfiguredModelId("RERANKER"),
      query: input.query,
      passages: input.passages,
    }),
  }, "RERANKER");

  const parsed = rankingEnvelopeSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new NvidiaAIError("The reranker returned an invalid response.", 502, "PARSE");
  }

  const rankings =
    parsed.data.rankings ??
    parsed.data.data?.map((item, index) => ({
      index: item.index ?? index,
      score: item.score,
    })) ??
    [];

  return rankings.sort((left, right) => right.score - left.score);
}

async function createChatCompletion(input: {
  purpose: NvidiaModelPurpose;
  model: NvidiaModelId;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const response = await nvidiaFetch("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      stream: false,
    }),
  }, input.purpose);

  const parsed = chatCompletionEnvelopeSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new NvidiaAIError("The NVIDIA model returned an invalid response.", 502, "PARSE");
  }

  const content = parsed.data.choices[0]?.message.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : ""))
      .join("")
      .trim();
  }

  throw new NvidiaAIError("The NVIDIA model response was empty.", 502, "PARSE");
}

async function nvidiaFetch(path: string, init: RequestInit, purpose: NvidiaModelPurpose) {
  const env = getServerEnv();
  const apiKey = getApiKeyForPurpose(env, purpose);

  if (!apiKey) {
    throw new NvidiaAIError(
      getMissingKeyMessage(purpose),
      503,
      "CONFIG",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.NVIDIA_AI_TIMEOUT_MS);

  try {
    const baseUrl = env.NVIDIA_API_BASE_URL.replace(/\/+$/, "").replace(/\/v1$/, "");
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      throw new NvidiaAIError(
        `NVIDIA Build API request failed with status ${response.status}.${body ? ` ${body.slice(0, 240)}` : ""}`,
        response.status,
        "UPSTREAM",
      );
    }

    return response;
  } catch (error) {
    if (error instanceof NvidiaAIError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new NvidiaAIError("The AI request timed out. Please try again.", 504, "TIMEOUT");
    }
    throw new NvidiaAIError("The AI service could not be reached.", 502, "UPSTREAM");
  } finally {
    clearTimeout(timeout);
  }
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export function extractJson(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new NvidiaAIError("The AI response did not contain a JSON object.", 502, "PARSE");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as unknown;
}

function getApiKeyForPurpose(
  env: ReturnType<typeof getServerEnv>,
  purpose: NvidiaModelPurpose,
) {
  switch (purpose) {
    case "MAIN":
      return env.NVIDIA_MAIN_API_KEY ?? env.NVIDIA_API_KEY;
    case "RERANKER":
      return env.NVIDIA_RERANK_API_KEY ?? env.NVIDIA_API_KEY;
    case "SAFETY":
      return env.NVIDIA_SAFETY_API_KEY ?? env.NVIDIA_API_KEY;
    case "SPEECH_TO_TEXT":
      return env.NVIDIA_STT_API_KEY ?? env.NVIDIA_API_KEY;
    case "IMPORT_CLEANUP":
      return env.NVIDIA_MAIN_API_KEY ?? env.NVIDIA_API_KEY;
    case "VOCAB_GENERATION":
      return env.NVIDIA_MAIN_API_KEY ?? env.NVIDIA_API_KEY;
    case "PDF_PROCESSING":
      return env.NVIDIA_MAIN_API_KEY ?? env.NVIDIA_API_KEY;
    case "LISTENING_SCRIPT":
      return env.NVIDIA_MAIN_API_KEY ?? env.NVIDIA_API_KEY;
  }
}

function getMissingKeyMessage(purpose: NvidiaModelPurpose) {
  switch (purpose) {
    case "MAIN":
      return "NVIDIA main-model requests require NVIDIA_MAIN_API_KEY or NVIDIA_API_KEY on the server.";
    case "RERANKER":
      return "NVIDIA rerank requests require NVIDIA_RERANK_API_KEY or NVIDIA_API_KEY on the server.";
    case "SAFETY":
      return "NVIDIA safety checks require NVIDIA_SAFETY_API_KEY or NVIDIA_API_KEY on the server.";
    case "SPEECH_TO_TEXT":
      return "NVIDIA speech-to-text requests require NVIDIA_STT_API_KEY or NVIDIA_API_KEY on the server.";
    case "IMPORT_CLEANUP":
      return "Vocabulary import cleanup requires NVIDIA_MAIN_API_KEY or NVIDIA_API_KEY on the server.";
    case "VOCAB_GENERATION":
      return "Daily AI vocabulary generation requires NVIDIA_MAIN_API_KEY or NVIDIA_API_KEY on the server.";
    case "PDF_PROCESSING":
      return "PDF processing requires NVIDIA_MAIN_API_KEY or NVIDIA_API_KEY on the server.";
    case "LISTENING_SCRIPT":
      return "Listening script generation requires NVIDIA_MAIN_API_KEY or NVIDIA_API_KEY on the server.";
  }
}

function isFeatureEnabledForPurpose(
  env: ReturnType<typeof getServerEnv>,
  purpose: NvidiaModelPurpose,
) {
  switch (purpose) {
    case "MAIN":
      return (
        env.AI_ENABLE_WRITING_EVALUATION ||
        env.AI_ENABLE_SPEAKING_EVALUATION ||
        env.AI_ENABLE_STUDY_PLAN ||
        env.AI_ENABLE_ADMIN_GENERATION
      );
    case "RERANKER":
      return env.AI_ENABLE_RERANKING;
    case "SAFETY":
      return env.AI_ENABLE_SAFETY_CHECK;
    case "SPEECH_TO_TEXT":
      return env.AI_ENABLE_STT;
    case "IMPORT_CLEANUP":
      return Boolean(env.NVIDIA_IMPORT_CLEANUP_MODEL ?? env.NVIDIA_MAIN_MODEL);
    case "VOCAB_GENERATION":
      return env.AI_VOCAB_GENERATION_ENABLED;
    case "PDF_PROCESSING":
      return env.PDF_PROCESSING_ENABLED;
    case "LISTENING_SCRIPT":
      return Boolean(env.NVIDIA_LISTENING_SCRIPT_MODEL ?? env.NVIDIA_MAIN_MODEL);
  }
}

export function getNvidiaModelInfo() {
  const env = getServerEnv();

  return getAIModelCatalog({
    mainModel: env.NVIDIA_MAIN_MODEL,
    rerankModel: env.NVIDIA_RERANK_MODEL,
    safetyModel: env.NVIDIA_SAFETY_MODEL,
    sttModel: env.NVIDIA_STT_MODEL,
  });
}
