import { z } from "zod";

export const NVIDIA_PRIMARY_MODEL = "meta/llama-4-maverick-17b-128e-instruct" as const;
export const NVIDIA_RERANK_MODEL = "nvidia/rerank-qa-mistral-4b" as const;
export const NVIDIA_SAFETY_MODEL =
  "nvidia/nemotron-content-safety-reasoning-4b" as const;
export const NVIDIA_OPTIONAL_STT_MODEL = "nvidia/parakeet-tdt-0.6b-v2" as const;
export type NvidiaModelPurpose = "MAIN" | "RERANKER" | "SAFETY" | "SPEECH_TO_TEXT";

export const NVIDIA_ALLOWED_MODEL_IDS = [
  NVIDIA_PRIMARY_MODEL,
  NVIDIA_RERANK_MODEL,
  NVIDIA_SAFETY_MODEL,
  NVIDIA_OPTIONAL_STT_MODEL,
] as const;

export const nvidiaModelIdSchema = z.enum(NVIDIA_ALLOWED_MODEL_IDS);

export type NvidiaModelId = z.infer<typeof nvidiaModelIdSchema>;

export const NVIDIA_MODEL_DEFAULTS = {
  MAIN: NVIDIA_PRIMARY_MODEL,
  RERANKER: NVIDIA_RERANK_MODEL,
  SAFETY: NVIDIA_SAFETY_MODEL,
  SPEECH_TO_TEXT: NVIDIA_OPTIONAL_STT_MODEL,
} as const satisfies Record<NvidiaModelPurpose, NvidiaModelId>;

export const NVIDIA_MODELS = {
  main: {
    id: NVIDIA_PRIMARY_MODEL,
    label: "Llama 4 Maverick 17B",
    purpose: "Primary structured generation and evaluation",
  },
  reranker: {
    id: NVIDIA_RERANK_MODEL,
    label: "Rerank QA Mistral 4B",
    purpose: "Ranking study-plan candidates and contextual snippets",
  },
  safety: {
    id: NVIDIA_SAFETY_MODEL,
    label: "Nemotron Content Safety Reasoning 4B",
    purpose: "Moderation and policy enforcement",
  },
  speechToText: {
    id: NVIDIA_OPTIONAL_STT_MODEL,
    label: "Parakeet TDT 0.6B v2",
    purpose: "Optional speech-to-text scaffold",
    limitations: "English-only model; keep FrancScore speaking review transcript-first for now.",
  },
} as const;

export const DEPRECATED_NVIDIA_MODELS = [
  "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "mistralai/mistral-medium-3-instruct",
  "nvidia/llama-3_2-nemoretriever-300m-embed-v1",
] as const;
