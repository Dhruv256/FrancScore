import "server-only";

import { createClient } from "@/lib/supabase/server";

export const XP_REWARDS = {
  VOCABULARY_ITEM_MASTERED: 5,
  FLASHCARD_REVIEW: 5,
  FLASHCARD_MASTERED_BONUS: 10,
  MCQ_ANSWERED: 10,
  MCQ_CORRECT_BONUS: 5,
  READING_PASSAGE_COMPLETED: 30,
  LISTENING_DRILL_COMPLETED: 30,
  WRITING_SUBMISSION: 80,
  SPEAKING_SUBMISSION: 80,
  MOCK_TEST_COMPLETED: 300,
} as const;

export function getMcqXp(isCorrect: boolean) {
  return XP_REWARDS.MCQ_ANSWERED + (isCorrect ? XP_REWARDS.MCQ_CORRECT_BONUS : 0);
}

export async function applyXpAndStreak(
  userId: string,
  xpEarned: number,
  activityAtIso: string,
) {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("total_xp, current_streak, longest_streak")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new Error(error?.message ?? "Unable to update XP.");
  }

  const nextStreak = await calculateNextStreak(userId, activityAtIso, profile.current_streak);
  const nextLongestStreak = Math.max(profile.longest_streak, nextStreak);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      total_xp: profile.total_xp + xpEarned,
      current_streak: nextStreak,
      longest_streak: nextLongestStreak,
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    totalXp: profile.total_xp + xpEarned,
    currentStreak: nextStreak,
    longestStreak: nextLongestStreak,
  };
}

async function calculateNextStreak(
  userId: string,
  activityAtIso: string,
  currentStreak: number,
) {
  const previousActivityAt = await getPreviousActivityTimestamp(userId, activityAtIso);

  if (!previousActivityAt) {
    return 1;
  }

  const activityDay = toUtcDateKey(activityAtIso);
  const previousDay = toUtcDateKey(previousActivityAt);

  if (activityDay === previousDay) {
    return currentStreak > 0 ? currentStreak : 1;
  }

  const diffDays = getDateDiffInDays(previousActivityAt, activityAtIso);
  if (diffDays === 1) {
    return currentStreak + 1;
  }

  return 1;
}

async function getPreviousActivityTimestamp(userId: string, beforeIso: string) {
  const supabase = await createClient();
  const timestampCandidates: string[] = [];

  const [attempts, flashcardReviews, writingSubmissions, speakingSubmissions, mockResults] =
    await Promise.all([
      supabase
        .from("attempts")
        .select("submitted_at")
        .eq("user_id", userId)
        .lt("submitted_at", beforeIso)
        .order("submitted_at", { ascending: false })
        .limit(1),
      supabase
        .from("flashcard_reviews")
        .select("reviewed_at")
        .eq("user_id", userId)
        .lt("reviewed_at", beforeIso)
        .order("reviewed_at", { ascending: false })
        .limit(1),
      supabase
        .from("writing_submissions")
        .select("created_at")
        .eq("user_id", userId)
        .lt("created_at", beforeIso)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("speaking_submissions")
        .select("created_at")
        .eq("user_id", userId)
        .lt("created_at", beforeIso)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("mock_test_results")
        .select("completed_at")
        .eq("user_id", userId)
        .lt("completed_at", beforeIso)
        .order("completed_at", { ascending: false })
        .limit(1),
    ]);

  if (attempts.data?.[0]?.submitted_at) {
    timestampCandidates.push(attempts.data[0].submitted_at);
  }
  if (flashcardReviews.data?.[0]?.reviewed_at) {
    timestampCandidates.push(flashcardReviews.data[0].reviewed_at);
  }
  if (writingSubmissions.data?.[0]?.created_at) {
    timestampCandidates.push(writingSubmissions.data[0].created_at);
  }
  if (speakingSubmissions.data?.[0]?.created_at) {
    timestampCandidates.push(speakingSubmissions.data[0].created_at);
  }
  if (mockResults.data?.[0]?.completed_at) {
    timestampCandidates.push(mockResults.data[0].completed_at);
  }

  if (!timestampCandidates.length) {
    return null;
  }

  return timestampCandidates.sort((left, right) => right.localeCompare(left))[0];
}

function getDateDiffInDays(previousIso: string, currentIso: string) {
  const previous = new Date(`${toUtcDateKey(previousIso)}T00:00:00.000Z`);
  const current = new Date(`${toUtcDateKey(currentIso)}T00:00:00.000Z`);
  return Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
}

function toUtcDateKey(isoString: string) {
  return new Date(isoString).toISOString().slice(0, 10);
}
