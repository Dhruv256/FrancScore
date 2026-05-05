import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { CEFRLevel, ExamType, TopicType, WritingFeedback, WritingPrompt } from "@/lib/types";
import type { WritingPromptOption, WritingSubmissionHistoryItem } from "@/lib/writing/types";

type WritingPromptRow = Database["public"]["Tables"]["writing_prompts"]["Row"];
type WritingSubmissionRow = Database["public"]["Tables"]["writing_submissions"]["Row"];

export async function getPublishedWritingPrompts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("writing_prompts")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapWritingPromptRow);
}

export async function getUserWritingSubmissions(userId: string) {
  const supabase = await createClient();
  const [submissionsResult, promptsResult] = await Promise.all([
    supabase
      .from("writing_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("writing_prompts").select("id, title, exam_type"),
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
    mapWritingSubmissionHistory(submission, promptMap),
  );
}

function mapWritingPromptRow(row: WritingPromptRow): WritingPromptOption {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    type: normalizePromptType(row.type),
    cefrLevel: normalizeCefrLevel(row.cefr_level),
    examType: normalizeExamType(row.exam_type),
    topicType: normalizeTopic(row.topic),
    wordLimit: {
      min: row.word_limit_min ?? 80,
      max: row.word_limit_max ?? 220,
    },
    criteria: Array.isArray(row.criteria)
      ? row.criteria.filter((item): item is string => typeof item === "string")
      : [],
    sampleResponse: row.sample_response ?? undefined,
  };
}

function mapWritingSubmissionHistory(
  row: WritingSubmissionRow,
  promptMap: Map<string, { title: string; examType: ExamType }>,
): WritingSubmissionHistoryItem {
  const prompt = promptMap.get(row.prompt_id);

  return {
    id: row.id,
    promptId: row.prompt_id,
    promptTitle: prompt?.title ?? "Writing Prompt",
    examType: prompt?.examType ?? "MIXED",
    status: row.status,
    wordCount: row.word_count ?? 0,
    submittedAt: row.created_at,
    estimatedCefr: normalizeOptionalCefrLevel(row.estimated_cefr),
    score20: row.score_20,
    review: isWritingFeedback(row.review_result) ? row.review_result : null,
  };
}

function isWritingFeedback(value: unknown): value is WritingFeedback {
  return typeof value === "object" && value !== null && "submissionType" in value;
}

function normalizePromptType(value: string | null): WritingPrompt["type"] {
  if (
    value === "FORMAL_LETTER" ||
    value === "ESSAY" ||
    value === "EMAIL" ||
    value === "REPORT" ||
    value === "OPINION"
  ) {
    return value;
  }

  return "ESSAY";
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
