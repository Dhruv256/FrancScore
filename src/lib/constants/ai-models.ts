import type { NvidiaModelId, NvidiaModelInfo } from "@/lib/ai/models";

export type AIModelId = NvidiaModelId;

export function getAIModelCatalog(input: {
  mainModel: NvidiaModelId;
  rerankModel: NvidiaModelId;
  safetyModel: NvidiaModelId;
  sttModel: NvidiaModelId;
}): NvidiaModelInfo[] {
  return [
    {
      id: input.mainModel,
      provider: "NVIDIA",
      purpose: "Primary structured generation and evaluation",
    },
    {
      id: input.rerankModel,
      provider: "NVIDIA",
      purpose: "Ranking study-plan candidates and contextual snippets",
    },
    {
      id: input.safetyModel,
      provider: "NVIDIA",
      purpose: "Moderation and policy enforcement",
    },
    {
      id: input.sttModel,
      provider: "NVIDIA",
      purpose: "Optional speech-to-text scaffold",
    },
  ];
}
