import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CEFRLevel,
  ExamType,
  SpeakingFeedback,
  SpeakingPromptType,
  TopicType,
} from "@/lib/types";
import type { SpeakingPromptOption, SpeakingSubmissionHistoryItem } from "@/lib/speaking/types";

type SpeakingPromptRow = Database["public"]["Tables"]["speaking_prompts"]["Row"];
type SpeakingSubmissionRow = Database["public"]["Tables"]["speaking_submissions"]["Row"];

export async function getPublishedSpeakingPrompts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("speaking_prompts")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapSpeakingPromptRow);
}

export async function getUserSpeakingSubmissions(userId: string) {
  const supabase = await createClient();
  const [submissionsResult, promptsResult] = await Promise.all([
    supabase
      .from("speaking_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("speaking_prompts").select("id, title, exam_type"),
  ]);

  if (submissionsResult.error) {
    throw new Error(submissionsResult.error.message);
  }
  if (promptsResult.error) {
    throw new Error(promptsResult.error.message);
  }

  const promptMap = new Map(
    (promptsResult.data ?? []).map((prompt) => [
      prompt.id,
      { title: prompt.title, examType: normalizeExamType(prompt.exam_type) },
    ]),
  );

  return (submissionsResult.data ?? []).map((submission) =>
    mapSpeakingSubmissionHistory(submission, promptMap),
  );
}

function mapSpeakingPromptRow(row: SpeakingPromptRow): SpeakingPromptOption {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    type: normalizePromptType(row.type),
    cefrLevel: normalizeCefrLevel(row.cefr_level),
    examType: normalizeExamType(row.exam_type),
    topicType: normalizeTopic(row.topic),
    durationSeconds: row.duration_seconds ?? 90,
    preparationSeconds: row.preparation_seconds ?? 30,
    criteria: Array.isArray(row.criteria)
      ? row.criteria.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function mapSpeakingSubmissionHistory(
  row: SpeakingSubmissionRow,
  promptMap: Map<string, { title: string; examType: ExamType }>,
): SpeakingSubmissionHistoryItem {
  const prompt = promptMap.get(row.prompt_id);

  return {
    id: row.id,
    promptId: row.prompt_id,
    promptTitle: prompt?.title ?? "Speaking Prompt",
    examType: prompt?.examType ?? "MIXED",
    status: row.status,
    submittedAt: row.created_at,
    estimatedCefr: normalizeOptionalCefrLevel(row.estimated_cefr),
    score20: row.score_20,
    transcript: row.transcript,
    audioPath: row.audio_path,
    review: isSpeakingFeedback(row.review_result) ? row.review_result : null,
  };
}

function isSpeakingFeedback(value: unknown): value is SpeakingFeedback {
  return typeof value === "object" && value !== null && "submissionType" in value;
}

function normalizePromptType(value: string | null): SpeakingPromptType {
  if (
    value === "MONOLOGUE" ||
    value === "DIALOGUE" ||
    value === "DESCRIPTION" ||
    value === "OPINION" ||
    value === "DEBATE"
  ) {
    return value;
  }

  return "MONOLOGUE";
}

function normalizeCefrLevel(value: string): CEFRLevel {
  if (
    value === "A1" ||
    value === "A2" ||
    value === "B1_MINUS" ||
    value === "B1" ||
    value === "B1_PLUS" ||
    value === "B2_MINUS" ||
    value === "B2" ||
    value === "B2_PLUS" ||
    value === "C1"
  ) {
    return value;
  }

  return "B1";
}

function normalizeOptionalCefrLevel(value: string | null): CEFRLevel | null {
  return value ? normalizeCefrLevel(value) : null;
}

function normalizeExamType(value: string): ExamType {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") {
    return value;
  }

  return "MIXED";
}

function normalizeTopic(value: string | null): TopicType {
  if (
    value === "WORK" ||
    value === "HOUSING" ||
    value === "HEALTH" ||
    value === "ADMINISTRATION" ||
    value === "OPINION" ||
    value === "EDUCATION" ||
    value === "IMMIGRATION" ||
    value === "DAILY_LIFE" ||
    value === "ENVIRONMENT" ||
    value === "TECHNOLOGY" ||
    value === "CULTURE" ||
    value === "TRAVEL"
  ) {
    return value;
  }

  return "WORK";
}
