import { z } from "zod";

export type NvidiaModelPurpose =
  | "MAIN"
  | "RERANKER"
  | "SAFETY"
  | "SPEECH_TO_TEXT"
  | "IMPORT_CLEANUP"
  | "VOCAB_GENERATION"
  | "PDF_PROCESSING"
  | "LISTENING_SCRIPT";

export const nvidiaModelIdSchema = z.string().min(1, "NVIDIA model name is required.");

export type NvidiaModelId = z.infer<typeof nvidiaModelIdSchema>;

export type NvidiaModelInfo = {
  id: NvidiaModelId;
  provider: "NVIDIA";
  purpose: string;
};
