import "server-only";

import { z } from "zod";
import { generateStructuredObject, NvidiaAIError } from "@/lib/ai/nvidia-client";
import { getServerEnv } from "@/lib/env/server";

const listeningScriptSchema = z.object({
  title: z.string().min(1),
  transcript: z.string().min(40),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct_answer_index: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  trap_type: z.enum([
    "NEGATION",
    "NUMBER_DATE",
    "CONTRAST_MARKER",
    "SYNONYM_TRAP",
    "FALSE_FRIEND",
    "IMPLICIT_MEANING",
  ]),
  topic: z.string().min(1),
  cefr_level: z.enum(["A2", "B1", "B1_PLUS", "B2"]),
  exam_type: z.enum(["TEF_CANADA", "TCF_CANADA", "BOTH"]),
  accent: z.string().min(1),
  speed: z.enum(["slow", "natural", "fast"]),
  speaker_role: z.string().min(1),
  context: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export type GeneratedListeningScript = z.infer<typeof listeningScriptSchema>;

export async function generateListeningScript(input?: {
  topic?: string;
  trapType?: string;
  cefrLevel?: string;
}) {
  const env = getServerEnv();
  const primaryModel = env.NVIDIA_LISTENING_SCRIPT_MODEL ?? env.NVIDIA_MAIN_MODEL;
  const fallbackModel = env.NVIDIA_LISTENING_FALLBACK_MODEL ?? env.NVIDIA_MAIN_MODEL;

  try {
    return {
      modelUsed: primaryModel,
      script: await requestListeningScript(primaryModel, input),
    };
  } catch (error) {
    if (!(error instanceof NvidiaAIError)) {
      throw error;
    }
    return {
      modelUsed: fallbackModel,
      script: await requestListeningScript(fallbackModel, input),
    };
  }
}

async function requestListeningScript(
  model: string,
  input?: {
    topic?: string;
    trapType?: string;
    cefrLevel?: string;
  },
) {
  return generateStructuredObject({
    purpose: "LISTENING_SCRIPT",
    model,
    schema: listeningScriptSchema,
    temperature: 0.55,
    maxTokens: 1800,
    messages: [
      {
        role: "system",
        content:
          "Generate varied original TEF/TCF Canada listening practice scripts. Return JSON only.",
      },
      {
        role: "user",
        content: [
          "Create one natural listening prompt with a unique context and script pattern.",
          "Return strict JSON with transcript, question, 4 options, correct_answer_index, explanation, trap_type, topic, cefr_level, exam_type, accent, speed, speaker_role, context, tags.",
          "",
          "Rules:",
          "- Use a different scenario style each time: announcement, conversation, voicemail, office interaction, public information, appointment, housing, health, admin, or work.",
          "- Include one trap: negation, number/date, contrast marker, synonym, condition, exception, or implied meaning.",
          "- Do not reuse generic templates.",
          "- Transcript must be short, natural spoken French and TTS-ready.",
          "- No audio_url; audio will be uploaded/generated separately.",
          `Preferred topic: ${input?.topic ?? "auto-mix"}`,
          `Preferred trap: ${input?.trapType ?? "auto-mix"}`,
          `Preferred level: ${input?.cefrLevel ?? "B1/B2"}`,
        ].join("\n"),
      },
    ],
  });
}
