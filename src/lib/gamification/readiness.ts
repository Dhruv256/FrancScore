import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { CEFRLevel, ReadinessScore, SkillProgress, TrendDirection } from "@/lib/types";

export async function getUserReadinessSnapshot(userId: string): Promise<{
  readinessScore: ReadinessScore;
  skillProgress: SkillProgress[];
  totalQuestionsAttempted: number;
  overallAccuracy: number;
}> {
  const supabase = await createClient();
  const [
    profileResult,
    attemptsResult,
    questionsResult,
    writingResult,
    speakingResult,
    wordBankResult,
    vocabularyResult,
    snapshotsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("current_streak").eq("id", userId).single(),
    supabase
      .from("attempts")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false }),
    supabase.from("questions").select("*"),
    supabase
      .from("writing_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("speaking_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("user_word_bank").select("*").eq("user_id", userId),
    supabase.from("vocabulary").select("id").eq("is_published", true),
    supabase
      .from("user_progress_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .limit(7),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (attemptsResult.error) throw new Error(attemptsResult.error.message);
  if (questionsResult.error) throw new Error(questionsResult.error.message);
  if (writingResult.error) throw new Error(writingResult.error.message);
  if (speakingResult.error) throw new Error(speakingResult.error.message);
  if (wordBankResult.error) throw new Error(wordBankResult.error.message);
  if (vocabularyResult.error) throw new Error(vocabularyResult.error.message);
  if (snapshotsResult.error) throw new Error(snapshotsResult.error.message);

  const questionMap = new Map(
    (questionsResult.data ?? []).map((question) => [question.id, question]),
  );
  const attempts = attemptsResult.data ?? [];
  const mcqBySkill = getMcqSkillMetrics(attempts, questionMap);
  const writingRows = writingResult.data ?? [];
  const speakingRows = speakingResult.data ?? [];
  const writingAverage = getAverageReviewScore(writingRows);
  const speakingAverage = getAverageReviewScore(speakingRows);
  const vocabularyMastery = getVocabularyMastery(
    wordBankResult.data ?? [],
    vocabularyResult.data?.length ?? 0,
  );
  const consistencyScore = Math.min(
    100,
    Math.round(((profileResult.data?.current_streak ?? 0) / 14) * 100),
  );

  const readinessScore = buildReadinessScore({
    listeningAccuracy: mcqBySkill.LISTENING.accuracy,
    readingAccuracy: mcqBySkill.READING.accuracy,
    writingAverage,
    speakingAverage,
    vocabularyMastery,
    consistencyScore,
  });

  const previousSnapshot = snapshotsResult.data?.[0] ?? null;
  const skillProgress = buildSkillProgress({
    mcqBySkill,
    writingAverage,
    speakingAverage,
    previousSnapshot,
    writingCount: writingRows.length,
    speakingCount: speakingRows.length,
  });

  await persistProgressSnapshot(userId, readinessScore, {
    listening: mcqBySkill.LISTENING.accuracy,
    reading: mcqBySkill.READING.accuracy,
    writing: writingAverage,
    speaking: speakingAverage,
    vocabulary: vocabularyMastery,
  });

  return {
    readinessScore,
    skillProgress,
    totalQuestionsAttempted: attempts.length,
    overallAccuracy: getOverallAccuracy(attempts),
  };
}

export function buildReadinessScore(input: {
  listeningAccuracy: number;
  readingAccuracy: number;
  writingAverage: number;
  speakingAverage: number;
  vocabularyMastery: number;
  consistencyScore: number;
}): ReadinessScore {
  const overall = Math.round(
    input.listeningAccuracy * 0.25 +
      input.readingAccuracy * 0.2 +
      input.writingAverage * 0.2 +
      input.speakingAverage * 0.2 +
      input.vocabularyMastery * 0.1 +
      input.consistencyScore * 0.05,
  );

  return {
    overall,
    bySkill: {
      LISTENING: roundScore(input.listeningAccuracy),
      READING: roundScore(input.readingAccuracy),
      WRITING: roundScore(input.writingAverage),
      SPEAKING: roundScore(input.speakingAverage),
    },
    cefrEstimate: getCefrEstimate(overall),
    lastUpdated: new Date().toISOString(),
  };
}

function buildSkillProgress(input: {
  mcqBySkill: Record<
    "LISTENING" | "READING",
    { accuracy: number; total: number; correct: number; lastPracticed: string | null }
  >;
  writingAverage: number;
  speakingAverage: number;
  previousSnapshot: Database["public"]["Tables"]["user_progress_snapshots"]["Row"] | null;
  writingCount: number;
  speakingCount: number;
}): SkillProgress[] {
  return [
    {
      skill: "LISTENING",
      percentage: roundScore(input.mcqBySkill.LISTENING.accuracy),
      cefrEstimate: getCefrEstimate(input.mcqBySkill.LISTENING.accuracy),
      trend: getTrend(
        input.mcqBySkill.LISTENING.accuracy,
        input.previousSnapshot?.listening_score,
      ),
      totalQuestions: input.mcqBySkill.LISTENING.total,
      correctAnswers: input.mcqBySkill.LISTENING.correct,
      lastPracticed:
        input.mcqBySkill.LISTENING.lastPracticed ?? new Date().toISOString(),
    },
    {
      skill: "READING",
      percentage: roundScore(input.mcqBySkill.READING.accuracy),
      cefrEstimate: getCefrEstimate(input.mcqBySkill.READING.accuracy),
      trend: getTrend(
        input.mcqBySkill.READING.accuracy,
        input.previousSnapshot?.reading_score,
      ),
      totalQuestions: input.mcqBySkill.READING.total,
      correctAnswers: input.mcqBySkill.READING.correct,
      lastPracticed:
        input.mcqBySkill.READING.lastPracticed ?? new Date().toISOString(),
    },
    {
      skill: "WRITING",
      percentage: roundScore(input.writingAverage),
      cefrEstimate: getCefrEstimate(input.writingAverage),
      trend: getTrend(input.writingAverage, input.previousSnapshot?.writing_score),
      totalQuestions: input.writingCount,
      correctAnswers: Math.round((input.writingAverage / 100) * input.writingCount),
      lastPracticed: new Date().toISOString(),
    },
    {
      skill: "SPEAKING",
      percentage: roundScore(input.speakingAverage),
      cefrEstimate: getCefrEstimate(input.speakingAverage),
      trend: getTrend(input.speakingAverage, input.previousSnapshot?.speaking_score),
      totalQuestions: input.speakingCount,
      correctAnswers: Math.round((input.speakingAverage / 100) * input.speakingCount),
      lastPracticed: new Date().toISOString(),
    },
  ];
}

function getMcqSkillMetrics(
  attempts: Database["public"]["Tables"]["attempts"]["Row"][],
  questionMap: Map<string, Database["public"]["Tables"]["questions"]["Row"]>,
) {
  const metrics = {
    LISTENING: { accuracy: 0, total: 0, correct: 0, lastPracticed: null as string | null },
    READING: { accuracy: 0, total: 0, correct: 0, lastPracticed: null as string | null },
  };

  for (const attempt of attempts) {
    const question = questionMap.get(attempt.question_id);
    if (!question) continue;
    if (question.skill_type !== "LISTENING" && question.skill_type !== "READING") continue;

    const bucket = metrics[question.skill_type];
    bucket.total += 1;
    bucket.correct += attempt.is_correct ? 1 : 0;
    if (!bucket.lastPracticed) {
      bucket.lastPracticed = attempt.submitted_at;
    }
  }

  for (const key of ["LISTENING", "READING"] as const) {
    const bucket = metrics[key];
    bucket.accuracy = bucket.total ? (bucket.correct / bucket.total) * 100 : 0;
  }

  return metrics;
}

function getAverageReviewScore(
  rows: Array<{
    review_result:
      | Database["public"]["Tables"]["writing_submissions"]["Row"]["review_result"]
      | Database["public"]["Tables"]["speaking_submissions"]["Row"]["review_result"]
      | null;
  }>,
) {
  const scores = rows
    .map((row) => extractScoreFromReview(row.review_result))
    .filter((value): value is number => typeof value === "number");

  if (!scores.length) {
    return 0;
  }

  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function extractScoreFromReview(
  reviewResult:
    | Database["public"]["Tables"]["writing_submissions"]["Row"]["review_result"]
    | Database["public"]["Tables"]["speaking_submissions"]["Row"]["review_result"]
    | null,
) {
  if (!reviewResult || typeof reviewResult !== "object" || Array.isArray(reviewResult)) {
    return null;
  }

  const candidates = [
    reviewResult.overallScore,
    reviewResult.score,
    reviewResult.estimatedScore,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number") {
      return Math.max(0, Math.min(100, candidate));
    }
  }

  return null;
}

function getVocabularyMastery(
  wordBankRows: Database["public"]["Tables"]["user_word_bank"]["Row"][],
  publishedVocabularyCount: number,
) {
  if (!publishedVocabularyCount) {
    return 0;
  }

  const masteredCount = wordBankRows.filter(
    (row) => row.status.toUpperCase() === "MASTERED",
  ).length;
  return (masteredCount / publishedVocabularyCount) * 100;
}

function getOverallAccuracy(attempts: Database["public"]["Tables"]["attempts"]["Row"][]) {
  if (!attempts.length) {
    return 0;
  }

  const correct = attempts.filter((attempt) => attempt.is_correct).length;
  return Math.round((correct / attempts.length) * 100);
}

async function persistProgressSnapshot(
  userId: string,
  readinessScore: ReadinessScore,
  scores: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
    vocabulary: number;
  },
) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: existingSnapshot } = await supabase
    .from("user_progress_snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("snapshot_date", today)
    .maybeSingle();

  const payload = {
    user_id: userId,
    overall_readiness: readinessScore.overall,
    cefr_estimate: readinessScore.cefrEstimate,
    listening_score: roundScore(scores.listening),
    reading_score: roundScore(scores.reading),
    writing_score: roundScore(scores.writing),
    speaking_score: roundScore(scores.speaking),
    vocabulary_score: roundScore(scores.vocabulary),
    snapshot_date: today,
  };

  if (existingSnapshot?.id) {
    await supabase
      .from("user_progress_snapshots")
      .update(payload)
      .eq("id", existingSnapshot.id);
  } else {
    await supabase.from("user_progress_snapshots").insert(payload);
  }
}

function getTrend(current: number, previous: number | null | undefined): TrendDirection {
  if (previous === null || previous === undefined) {
    return "STABLE";
  }
  if (current - previous >= 3) return "UP";
  if (previous - current >= 3) return "DOWN";
  return "STABLE";
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getCefrEstimate(score: number): CEFRLevel {
  if (score >= 90) return "C1";
  if (score >= 78) return "B2_PLUS";
  if (score >= 68) return "B2";
  if (score >= 60) return "B2_MINUS";
  if (score >= 52) return "B1_PLUS";
  if (score >= 42) return "B1";
  if (score >= 30) return "B1_MINUS";
  if (score >= 18) return "A2";
  return "A1";
}
