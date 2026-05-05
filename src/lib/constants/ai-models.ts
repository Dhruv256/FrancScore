import {
  NVIDIA_ALLOWED_MODEL_IDS,
  NVIDIA_MODELS,
  type NvidiaModelId,
} from "@/lib/ai/models";

export const AI_MODELS = [
  {
    id: NVIDIA_MODELS.main.id,
    provider: "NVIDIA",
    label: NVIDIA_MODELS.main.label,
    purpose: NVIDIA_MODELS.main.purpose,
  },
  {
    id: NVIDIA_MODELS.reranker.id,
    provider: "NVIDIA",
    label: NVIDIA_MODELS.reranker.label,
    purpose: NVIDIA_MODELS.reranker.purpose,
  },
  {
    id: NVIDIA_MODELS.safety.id,
    provider: "NVIDIA",
    label: NVIDIA_MODELS.safety.label,
    purpose: NVIDIA_MODELS.safety.purpose,
  },
  {
    id: NVIDIA_MODELS.speechToText.id,
    provider: "NVIDIA",
    label: NVIDIA_MODELS.speechToText.label,
    purpose: NVIDIA_MODELS.speechToText.purpose,
  },
] as const;

export { NVIDIA_ALLOWED_MODEL_IDS };
export type AIModelId = NvidiaModelId;
