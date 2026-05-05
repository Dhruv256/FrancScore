import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Badge } from "@/lib/types";

type BadgeMetric = {
  current: number;
  target: number;
};

export const BADGE_TARGETS = {
  "Negation Hunter": 20,
  "Listening Survivor": 7,
  "B2 Writer": 5,
  "Speaking Builder": 10,
  "Mock Warrior": 3,
  "Speed Reader": 5,
  "Trap Killer": 50,
} as const;

export async function syncUserBadges(userId: string): Promise<Badge[]> {
  const supabase = await createClient();
  const [badgesResult, userBadgesResult, attemptsResult, questionsResult, passagesResult, writingResult, speakingResult, mockResult] =
    await Promise.all([
      supabase.from("badges").select("*").eq("is_published", true),
      supabase.from("user_badges").select("*").eq("user_id", userId),
      supabase.from("attempts").select("*").eq("user_id", userId),
      supabase.from("questions").select("*"),
      supabase.from("passages").select("*"),
      supabase.from("writing_submissions").select("*").eq("user_id", userId),
      supabase.from("speaking_submissions").select("*").eq("user_id", userId),
      supabase.from("mock_test_results").select("*").eq("user_id", userId),
    ]);

  if (badgesResult.error) throw new Error(badgesResult.error.message);
  if (userBadgesResult.error) throw new Error(userBadgesResult.error.message);
  if (attemptsResult.error) throw new Error(attemptsResult.error.message);
  if (questionsResult.error) throw new Error(questionsResult.error.message);
  if (passagesResult.error) throw new Error(passagesResult.error.message);
  if (writingResult.error) throw new Error(writingResult.error.message);
  if (speakingResult.error) throw new Error(speakingResult.error.message);
  if (mockResult.error) throw new Error(mockResult.error.message);

  const questions = new Map((questionsResult.data ?? []).map((row) => [row.id, row]));
  const passages = new Map((passagesResult.data ?? []).map((row) => [row.id, row]));
  const metrics = computeBadgeMetrics({
    attempts: attemptsResult.data ?? [],
    questions,
    passages,
    writingSubmissions: writingResult.data ?? [],
    speakingSubmissions: speakingResult.data ?? [],
    mockResults: mockResult.data ?? [],
  });
  const existing = new Map((userBadgesResult.data ?? []).map((row) => [row.badge_id, row]));

  const persistedBadges: Badge[] = [];

  for (const badgeRow of badgesResult.data ?? []) {
    const metric = metrics.get(badgeRow.name);
    if (!metric) {
      continue;
    }

    const progress = Math.min(100, Math.round((metric.current / metric.target) * 100));
    const existingUserBadge = existing.get(badgeRow.id);
    const isEarned = metric.current >= metric.target;
    const earnedAt = isEarned ? existingUserBadge?.earned_at ?? new Date().toISOString() : existingUserBadge?.earned_at ?? null;

    if (existingUserBadge) {
      await supabase
        .from("user_badges")
        .update({
          progress,
          earned_at: earnedAt,
        })
        .eq("id", existingUserBadge.id);
    } else {
      await supabase.from("user_badges").insert({
        user_id: userId,
        badge_id: badgeRow.id,
        progress,
        earned_at: earnedAt,
      });
    }

    persistedBadges.push({
      id: badgeRow.id,
      name: badgeRow.name,
      description: badgeRow.description,
      icon: badgeRow.icon ?? "🏅",
      category: badgeRow.category as Badge["category"],
      earnedAt: earnedAt ?? undefined,
      progress,
      requirement: badgeRow.requirement ?? "",
      xpReward: badgeRow.xp_reward,
    });
  }

  return persistedBadges;
}

export function computeBadgeMetrics(input: {
  attempts: Database["public"]["Tables"]["attempts"]["Row"][];
  questions: Map<string, Database["public"]["Tables"]["questions"]["Row"]>;
  passages: Map<string, Database["public"]["Tables"]["passages"]["Row"]>;
  writingSubmissions: Database["public"]["Tables"]["writing_submissions"]["Row"][];
  speakingSubmissions: Database["public"]["Tables"]["speaking_submissions"]["Row"][];
  mockResults: Database["public"]["Tables"]["mock_test_results"]["Row"][];
}) {
  const metrics = new Map<string, BadgeMetric>();

  const correctNegation = input.attempts.filter((attempt) => {
    const question = input.questions.get(attempt.question_id);
    return attempt.is_correct && question?.trap_type === "NEGATION";
  }).length;

  const listeningDays = new Set(
    input.attempts
      .filter((attempt) => input.questions.get(attempt.question_id)?.skill_type === "LISTENING")
      .map((attempt) => attempt.submitted_at.slice(0, 10)),
  ).size;

  const b2WritingCount = input.writingSubmissions.filter((submission) =>
    hasB2OrAbove(submission.review_result),
  ).length;

  const speakingCount = input.speakingSubmissions.length;
  const mockCount = input.mockResults.length;

  const speedReaderCount = countSpeedReaderPassages(input.attempts, input.questions, input.passages);

  const trapKillerCount = input.attempts.filter((attempt) => {
    const question = input.questions.get(attempt.question_id);
    return attempt.is_correct && Boolean(question?.trap_type);
  }).length;

  metrics.set("Negation Hunter", { current: correctNegation, target: BADGE_TARGETS["Negation Hunter"] });
  metrics.set("Listening Survivor", { current: listeningDays, target: BADGE_TARGETS["Listening Survivor"] });
  metrics.set("B2 Writer", { current: b2WritingCount, target: BADGE_TARGETS["B2 Writer"] });
  metrics.set("Speaking Builder", { current: speakingCount, target: BADGE_TARGETS["Speaking Builder"] });
  metrics.set("Mock Warrior", { current: mockCount, target: BADGE_TARGETS["Mock Warrior"] });
  metrics.set("Speed Reader", { current: speedReaderCount, target: BADGE_TARGETS["Speed Reader"] });
  metrics.set("Trap Killer", { current: trapKillerCount, target: BADGE_TARGETS["Trap Killer"] });

  return metrics;
}

function hasB2OrAbove(reviewResult: Database["public"]["Tables"]["writing_submissions"]["Row"]["review_result"] | null) {
  if (!reviewResult || typeof reviewResult !== "object" || Array.isArray(reviewResult)) {
    return false;
  }

  const level = reviewResult.estimatedLevel ?? reviewResult.estimatedCefrLevel;
  if (level === "B2" || level === "B2_PLUS" || level === "C1") {
    return true;
  }

  const score = reviewResult.score ?? reviewResult.overallScore;
  return typeof score === "number" ? score >= 68 : false;
}

function countSpeedReaderPassages(
  attempts: Database["public"]["Tables"]["attempts"]["Row"][],
  questions: Map<string, Database["public"]["Tables"]["questions"]["Row"]>,
  passages: Map<string, Database["public"]["Tables"]["passages"]["Row"]>,
) {
  const grouped = new Map<string, { totalTime: number; answeredQuestions: Set<string> }>();
  const passageQuestionMap = new Map<string, Set<string>>();

  for (const question of questions.values()) {
    if (question.skill_type === "READING" && question.passage_id) {
      const bucket = passageQuestionMap.get(question.passage_id) ?? new Set<string>();
      bucket.add(question.id);
      passageQuestionMap.set(question.passage_id, bucket);
    }
  }

  for (const attempt of attempts) {
    const question = questions.get(attempt.question_id);
    if (!question?.passage_id || question.skill_type !== "READING") {
      continue;
    }

    const bucket =
      grouped.get(question.passage_id) ?? {
        totalTime: 0,
        answeredQuestions: new Set<string>(),
      };
    bucket.totalTime += attempt.time_taken_seconds ?? 0;
    bucket.answeredQuestions.add(question.id);
    grouped.set(question.passage_id, bucket);
  }

  let completedWithinTarget = 0;

  for (const [passageId, summary] of grouped.entries()) {
    const passage = passages.get(passageId);
    const requiredQuestions = passageQuestionMap.get(passageId);
    if (!passage || !requiredQuestions?.size || !passage.estimated_minutes) {
      continue;
    }

    if (summary.answeredQuestions.size >= requiredQuestions.size) {
      const targetSeconds = passage.estimated_minutes * 60;
      if (summary.totalTime <= targetSeconds) {
        completedWithinTarget += 1;
      }
    }
  }

  return completedWithinTarget;
}
