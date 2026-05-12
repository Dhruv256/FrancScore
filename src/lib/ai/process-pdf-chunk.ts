import "server-only";

import { z } from "zod";
import { generateStructuredObject, NvidiaAIError } from "@/lib/ai/nvidia-client";
import { getServerEnv } from "@/lib/env/server";

const pdfFlashcardSchema = z.object({
  french_word: z.string().default(""),
  english_meaning: z.string().default(""),
  french_example: z.string().default(""),
  english_example_translation: z.string().default(""),
  tags: z.array(z.string()).default([]),
});

const pdfQuestionSchema = z.object({
  question_type: z.enum(["mcq", "short_answer", "writing", "speaking"]),
  question: z.string().default(""),
  options: z.array(z.string()).default([]),
  correct_answer: z.string().default(""),
  explanation: z.string().default(""),
});

const pdfImportItemSchema = z.object({
  item_type: z.enum([
    "grammar_concept",
    "vocabulary",
    "phrase",
    "connector",
    "example",
    "exercise",
    "reading_passage",
    "writing_prompt",
    "speaking_prompt",
    "chapter_heading",
    "study_note",
    "invalid",
  ]),
  title: z.string().default(""),
  summary: z.string().default(""),
  content: z.string().default(""),
  french_text: z.string().default(""),
  english_explanation: z.string().default(""),
  cefr_level: z.enum(["A1", "A2", "B1", "B1+", "B2", "B2+"]).default("B1"),
  exam_type: z.enum(["TEF", "TCF", "BOTH"]).default("BOTH"),
  topic: z.string().default(""),
  tags: z.array(z.string()).default([]),
  flashcards: z.array(pdfFlashcardSchema).default([]),
  questions: z.array(pdfQuestionSchema).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const pdfChunkAiResultSchema = z.object({
  items: z.array(pdfImportItemSchema).default([]),
});

export type PdfChunkAiResult = z.infer<typeof pdfChunkAiResultSchema>;
export type PdfChunkAiItem = z.infer<typeof pdfImportItemSchema>;

export async function processPdfChunkWithAi(input: {
  rawText: string;
  pageStart: number | null;
  pageEnd: number | null;
}) {
  const env = getServerEnv();

  if (!env.PDF_PROCESSING_ENABLED) {
    throw new NvidiaAIError(
      "PDF processing is disabled. Set PDF_PROCESSING_ENABLED=true on the server.",
      503,
      "CONFIG",
    );
  }

  const primaryModel = env.NVIDIA_PDF_PROCESSING_MODEL ?? env.NVIDIA_MAIN_MODEL;
  const fallbackModel = env.NVIDIA_PDF_FALLBACK_MODEL ?? env.NVIDIA_MAIN_MODEL;

  try {
    return {
      modelUsed: primaryModel,
      result: await requestPdfChunkProcessing(primaryModel, input),
    };
  } catch (error) {
    if (!(error instanceof NvidiaAIError)) {
      throw error;
    }

    return {
      modelUsed: fallbackModel,
      result: await requestPdfChunkProcessing(fallbackModel, input),
    };
  }
}

async function requestPdfChunkProcessing(
  model: string,
  input: {
    rawText: string;
    pageStart: number | null;
    pageEnd: number | null;
  },
) {
  return generateStructuredObject({
    purpose: "PDF_PROCESSING",
    model,
    schema: pdfChunkAiResultSchema,
    temperature: 0.2,
    maxTokens: 6000,
    messages: [
      {
        role: "system",
        content:
          "You convert French exam-prep PDF chunks into structured FrancScore learning material. Return JSON only.",
      },
      {
        role: "user",
        content: [
          "Classify the following PDF chunk into useful app learning material.",
          "Return strict JSON only with this shape:",
          '{"items":[{"item_type":"grammar_concept | vocabulary | phrase | connector | example | exercise | reading_passage | writing_prompt | speaking_prompt | chapter_heading | study_note | invalid","title":"","summary":"","content":"","french_text":"","english_explanation":"","cefr_level":"A1 | A2 | B1 | B1+ | B2 | B2+","exam_type":"TEF | TCF | BOTH","topic":"","tags":[],"flashcards":[{"french_word":"","english_meaning":"","french_example":"","english_example_translation":"","tags":[]}],"questions":[{"question_type":"mcq | short_answer | writing | speaking","question":"","options":[],"correct_answer":"","explanation":""}],"confidence":0.0}]}',
          "",
          "Rules:",
          "- Do not dump raw PDF text directly.",
          "- Preserve meaningful concepts by restructuring them into notes, flashcards, and practice.",
          "- Do not turn chapter headings into flashcards.",
          "- Extract useful vocabulary, phrases, and connectors.",
          "- Extract grammar concepts separately from vocabulary.",
          "- Generate clean examples only when source examples are missing or weak.",
          "- Keep examples natural, short, and exam-useful.",
          "- Mark noise, page furniture, answer keys without context, or empty content as invalid.",
          "- Return JSON only.",
          "",
          `Pages: ${input.pageStart ?? "unknown"}-${input.pageEnd ?? "unknown"}`,
          "PDF chunk:",
          input.rawText.slice(0, 18000),
        ].join("\n"),
      },
    ],
  });
}
