import "server-only";

import { applyXpAndStreak, getMcqXp } from "@/lib/gamification/xp";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { TrapType } from "@/lib/types";
import type {
  PracticeAttemptRequest,
  PracticeAttemptResponse,
  PracticeFilters,
  PracticePassage,
  PracticeProgressSummary,
  PracticeQuestion,
  PracticeQuestionListResponse,
  PracticeSkill,
} from "@/lib/practice/types";

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type AttemptInsert = Database["public"]["Tables"]["attempts"]["Insert"];

export async function getPracticeQuestionSet(
  filters: PracticeFilters,
  userId: string,
): Promise<PracticeQuestionListResponse> {
  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select("*")
    .eq("skill_type", filters.skill)
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  const examTypes = getExamTypeFilterValues(filters.examType);
  if (examTypes) {
    query = query.in("exam_type", examTypes);
  }

  if (filters.level !== "ALL") {
    query = query.eq("cefr_level", filters.level);
  }

  if (filters.topic !== "ALL") {
    query = query.eq("topic", filters.topic);
  }

  if (filters.trapType !== "ALL") {
    query = query.eq("trap_type", filters.trapType);
  }

  const { data: rawQuestions, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const questions = (rawQuestions ?? []).filter(isPracticeQuestionRow);
  const passages = await getPassagesByIds(
    questions
      .map((question) => question.passage_id)
      .filter((value): value is string => Boolean(value)),
  );
  const progress = await getPracticeProgress(filters.skill, userId);

  const items = questions
    .map((question) =>
      sanitizeQuestion(question, question.passage_id ? passages.get(question.passage_id) ?? null : null),
    )
    .sort((left, right) => comparePracticeQuestions(left, right, filters.skill));

  return {
    filters,
    items,
    progress,
  };
}

export async function submitPracticeAttempt(
  userId: string,
  payload: PracticeAttemptRequest,
): Promise<PracticeAttemptResponse> {
  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", payload.questionId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!question || !isSubmissionQuestionRow(question)) {
    throw new Error("Question not found.");
  }

  const isCorrect = payload.selectedAnswerIndex === question.correct_answer_index;
  const submittedAt = new Date().toISOString();
  const attemptInsert: AttemptInsert = {
    user_id: userId,
    question_id: payload.questionId,
    selected_answer_index: payload.selectedAnswerIndex,
    is_correct: isCorrect,
    response_time_ms: payload.timeTakenSeconds * 1000,
    time_taken_seconds: payload.timeTakenSeconds,
    submitted_at: submittedAt,
    metadata: {
      mode: payload.mode,
      submitted_from: question.skill_type,
    } satisfies Json,
  };

  const { error: insertError } = await supabase.from("attempts").insert(attemptInsert);

  if (insertError) {
    throw new Error(insertError.message);
  }

  await applyXpAndStreak(userId, getMcqXp(isCorrect), submittedAt);
  const progress = await getPracticeProgress(question.skill_type as PracticeSkill, userId);

  return {
    questionId: payload.questionId,
    correctAnswerIndex: question.correct_answer_index,
    isCorrect,
    explanation: question.explanation,
    trapType: normalizeTrapType(question.trap_type),
    transcript: await resolveAttemptTranscript(question),
    progress,
  };
}

async function resolveAttemptTranscript(
  question: Pick<QuestionRow, "transcript" | "passage_id">,
) {
  if (question.transcript || !question.passage_id) {
    return question.transcript;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("passages")
    .select("transcript")
    .eq("id", question.passage_id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.transcript ?? null;
}

async function getPassagesByIds(passageIds: string[]) {
  if (!passageIds.length) {
    return new Map<string, PracticePassage>();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("passages")
    .select("*")
    .in("id", [...new Set(passageIds)])
    .eq("is_published", true);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((passage) => [
      passage.id,
      {
        id: passage.id,
        title: passage.title,
        content: passage.content ?? passage.transcript ?? "",
        transcript: passage.transcript,
        audioUrl: passage.audio_url,
        type: passage.type,
        highlightedVocabulary: passage.highlighted_vocabulary ?? [],
        wordCount: passage.word_count,
        estimatedMinutes: passage.estimated_minutes,
      } satisfies PracticePassage,
    ]),
  );
}

async function getPracticeProgress(
  skill: PracticeSkill,
  userId: string,
): Promise<PracticeProgressSummary> {
  const supabase = await createClient();
  const { data: questionRows, error: questionError } = await supabase
    .from("questions")
    .select("*")
    .eq("skill_type", skill);

  if (questionError) {
    throw new Error(questionError.message);
  }

  const questionMap = new Map(
    (questionRows ?? []).map((question) => [
      question.id,
      normalizeTrapType(question.trap_type),
    ]),
  );
  const questionIds = [...questionMap.keys()];

  if (!questionIds.length) {
    return {
      skillAccuracy: 0,
      totalAttempted: 0,
      recentWeakTrapTypes: [],
    };
  }

  const { data: attempts, error: attemptError } = await supabase
    .from("attempts")
    .select("*")
    .eq("user_id", userId)
    .in("question_id", questionIds)
    .order("submitted_at", { ascending: false });

  if (attemptError) {
    throw new Error(attemptError.message);
  }

  const relevantAttempts = attempts ?? [];
  const totalAttempted = relevantAttempts.length;
  const correctCount = relevantAttempts.filter((attempt) => attempt.is_correct).length;
  const weakTrapCounts = new Map<TrapType, number>();

  relevantAttempts
    .filter((attempt) => attempt.is_correct === false)
    .slice(0, 20)
    .forEach((attempt) => {
      const trapType = questionMap.get(attempt.question_id);
      if (!trapType) {
        return;
      }

      weakTrapCounts.set(trapType, (weakTrapCounts.get(trapType) ?? 0) + 1);
    });

  return {
    skillAccuracy: totalAttempted ? Math.round((correctCount / totalAttempted) * 100) : 0,
    totalAttempted,
    recentWeakTrapTypes: [...weakTrapCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([trapType]) => trapType),
  };
}

function sanitizeQuestion(
  question: QuestionRow,
  passage: PracticePassage | null,
): PracticeQuestion {
  return {
    id: question.id,
    skill: question.skill_type as PracticeSkill,
    examType: question.exam_type,
    level: question.cefr_level as PracticeQuestion["level"],
    topic: (question.topic as PracticeQuestion["topic"]) ?? null,
    difficulty: question.difficulty as PracticeQuestion["difficulty"],
    prompt: question.question_text,
    options: Array.isArray(question.options) ? question.options.filter(isString) : [],
    trapType: normalizeTrapType(question.trap_type),
    tags: question.tags ?? [],
    audioUrl: question.audio_url ?? passage?.audioUrl ?? null,
    hasTranscript: Boolean(question.transcript ?? passage?.transcript),
    passageId: question.passage_id,
    passage,
  };
}

function normalizeTrapType(value: string | null): TrapType | null {
  if (
    value === "NEGATION" ||
    value === "NUMBER_DATE" ||
    value === "CONTRAST_MARKER" ||
    value === "SYNONYM_TRAP" ||
    value === "FALSE_FRIEND" ||
    value === "DOUBLE_NEGATIVE" ||
    value === "IMPLICIT_MEANING"
  ) {
    return value;
  }

  return null;
}

function getExamTypeFilterValues(examType: PracticeFilters["examType"]) {
  if (examType === "ALL") {
    return null;
  }

  if (examType === "MIXED") {
    return ["MIXED", "BOTH", "TEF_CANADA", "TCF_CANADA"];
  }

  return [examType, "BOTH"];
}

function isPracticeQuestionRow(
  question: Partial<QuestionRow>,
): question is QuestionRow {
  return (
    typeof question.id === "string" &&
    typeof question.question_text === "string" &&
    Array.isArray(question.options)
  );
}

function isSubmissionQuestionRow(
  question: Partial<QuestionRow>,
): question is Pick<
  QuestionRow,
  "id" | "correct_answer_index" | "explanation" | "trap_type" | "transcript" | "skill_type"
  | "passage_id"
> {
  return (
    typeof question.id === "string" &&
    typeof question.correct_answer_index === "number" &&
    typeof question.skill_type === "string"
  );
}

function isString(value: Json): value is string {
  return typeof value === "string";
}

function comparePracticeQuestions(
  left: PracticeQuestion,
  right: PracticeQuestion,
  skill: PracticeSkill,
) {
  if (skill === "LISTENING") {
    const leftAudio = left.audioUrl ? 1 : 0;
    const rightAudio = right.audioUrl ? 1 : 0;
    if (leftAudio !== rightAudio) {
      return rightAudio - leftAudio;
    }
  }

  return left.id.localeCompare(right.id);
}
