import "server-only";

import { getMcqXp, XP_REWARDS } from "@/lib/gamification/xp";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AnalyticsData,
  DailyTask,
  TopicType,
  VocabularyStatus,
  VocabularyWord,
} from "@/lib/types";

type VocabularyRow = Database["public"]["Tables"]["vocabulary"]["Row"];
type WordBankRow = Database["public"]["Tables"]["user_word_bank"]["Row"];

export async function getPublishedDailyTasks(): Promise<DailyTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: true })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row, index) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    skill: normalizeSkill(row.skill_type),
    xpReward: row.xp_reward,
    estimatedMinutes: row.estimated_minutes,
    icon: row.icon ?? inferTaskIcon(row.skill_type),
    status: index < 3 ? "PENDING" : "LOCKED",
  }));
}

export async function getVocabularyBankWords(userId: string): Promise<VocabularyWord[]> {
  const supabase = await createClient();
  const [vocabularyResult, bankResult] = await Promise.all([
    supabase
      .from("vocabulary")
      .select("*")
      .eq("is_published", true)
      .order("frequency_score", { ascending: false })
      .order("french_word", { ascending: true }),
    supabase.from("user_word_bank").select("*").eq("user_id", userId),
  ]);

  if (vocabularyResult.error) {
    throw new Error(vocabularyResult.error.message);
  }
  if (bankResult.error) {
    throw new Error(bankResult.error.message);
  }

  const bankMap = new Map((bankResult.data ?? []).map((row) => [row.vocabulary_id, row]));
  return (vocabularyResult.data ?? []).map((row) => mapVocabularyRow(row, bankMap.get(row.id)));
}

export async function getProgressAnalytics(userId: string): Promise<AnalyticsData[]> {
  const supabase = await createClient();
  const [snapshotResult, attemptsResult, writingResult, speakingResult, flashcardResult, mockResult] =
    await Promise.all([
      supabase
        .from("user_progress_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: true })
        .limit(14),
      supabase.from("attempts").select("submitted_at, is_correct").eq("user_id", userId),
      supabase.from("writing_submissions").select("created_at").eq("user_id", userId),
      supabase.from("speaking_submissions").select("created_at").eq("user_id", userId),
      supabase.from("flashcard_reviews").select("reviewed_at, xp_earned").eq("user_id", userId),
      supabase.from("mock_test_results").select("completed_at").eq("user_id", userId),
    ]);

  if (snapshotResult.error) throw new Error(snapshotResult.error.message);
  if (attemptsResult.error) throw new Error(attemptsResult.error.message);
  if (writingResult.error) throw new Error(writingResult.error.message);
  if (speakingResult.error) throw new Error(speakingResult.error.message);
  if (flashcardResult.error) throw new Error(flashcardResult.error.message);
  if (mockResult.error) throw new Error(mockResult.error.message);

  const perDay = new Map<string, AnalyticsData>();

  for (const snapshot of snapshotResult.data ?? []) {
    perDay.set(snapshot.snapshot_date, {
      date: snapshot.snapshot_date,
      listening: Math.round(snapshot.listening_score ?? 0),
      reading: Math.round(snapshot.reading_score ?? 0),
      writing: Math.round(snapshot.writing_score ?? 0),
      speaking: Math.round(snapshot.speaking_score ?? 0),
      xp: 0,
      questionsAnswered: 0,
    });
  }

  for (const attempt of attemptsResult.data ?? []) {
    const day = attempt.submitted_at.slice(0, 10);
    const bucket = ensureAnalyticsBucket(perDay, day);
    bucket.questionsAnswered += 1;
    bucket.xp += getMcqXp(Boolean(attempt.is_correct));
  }

  for (const item of writingResult.data ?? []) {
    const bucket = ensureAnalyticsBucket(perDay, item.created_at.slice(0, 10));
    bucket.xp += XP_REWARDS.WRITING_SUBMISSION;
  }

  for (const item of speakingResult.data ?? []) {
    const bucket = ensureAnalyticsBucket(perDay, item.created_at.slice(0, 10));
    bucket.xp += XP_REWARDS.SPEAKING_SUBMISSION;
  }

  for (const item of flashcardResult.data ?? []) {
    const bucket = ensureAnalyticsBucket(perDay, item.reviewed_at.slice(0, 10));
    bucket.xp += item.xp_earned ?? XP_REWARDS.FLASHCARD_REVIEW;
  }

  for (const item of mockResult.data ?? []) {
    const bucket = ensureAnalyticsBucket(perDay, item.completed_at.slice(0, 10));
    bucket.xp += XP_REWARDS.MOCK_TEST_COMPLETED;
  }

  return [...perDay.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function mapVocabularyRow(row: VocabularyRow, wordBankRow?: WordBankRow): VocabularyWord {
  return {
    id: row.id,
    frenchWord: row.french_word,
    englishMeaning: row.english_meaning,
    frenchExample: row.french_example ?? undefined,
    englishExampleTranslation: row.english_example_translation ?? undefined,
    cefrLevel: normalizeCefr(row.cefr_level),
    topicType: normalizeTopic(row.topic),
    examType: normalizeExamScope(row.exam_type),
    frequencyScore: row.frequency_score,
    tags: row.tags ?? [],
    trapType: inferTrapType(row.tags ?? []),
    isPublished: row.is_published,
    status: normalizeStatus(wordBankRow?.status),
    reviewCount: wordBankRow?.review_count ?? 0,
    lastReviewedAt: wordBankRow?.last_reviewed_at ?? undefined,
    nextReviewAt: wordBankRow?.next_review_at ?? undefined,
  };
}

function ensureAnalyticsBucket(map: Map<string, AnalyticsData>, day: string) {
  const existing = map.get(day);
  if (existing) {
    return existing;
  }

  const next: AnalyticsData = {
    date: day,
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0,
    xp: 0,
    questionsAnswered: 0,
  };
  map.set(day, next);
  return next;
}

function normalizeStatus(value?: string | null): VocabularyStatus {
  switch ((value ?? "new").toUpperCase()) {
    case "LEARNING":
      return "LEARNING";
    case "WEAK":
      return "WEAK";
    case "MASTERED":
      return "MASTERED";
    default:
      return "NEW";
  }
}

function normalizeExamScope(value: string) {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED" || value === "BOTH") {
    return value === "BOTH" ? "ALL_EXAMS" : value;
  }

  return "ALL_EXAMS";
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

function normalizeCefr(value: string) {
  return (
    value === "A1" ||
    value === "A2" ||
    value === "B1_MINUS" ||
    value === "B1" ||
    value === "B1_PLUS" ||
    value === "B2_MINUS" ||
    value === "B2" ||
    value === "B2_PLUS" ||
    value === "C1"
  )
    ? value
    : "B1";
}

function normalizeSkill(value: string): DailyTask["skill"] {
  if (
    value === "LISTENING" ||
    value === "READING" ||
    value === "WRITING" ||
    value === "SPEAKING" ||
    value === "VOCABULARY"
  ) {
    return value;
  }

  return "VOCABULARY";
}

function inferTaskIcon(skill: string) {
  switch (skill) {
    case "LISTENING":
      return "Headphones";
    case "READING":
      return "BookOpen";
    case "WRITING":
      return "PenTool";
    case "SPEAKING":
      return "Mic";
    default:
      return "Library";
  }
}

function inferTrapType(tags: string[]) {
  if (tags.includes("negation") || tags.includes("double-negative")) return "NEGATION";
  if (tags.includes("number") || tags.includes("time") || tags.includes("date")) return "NUMBER_DATE";
  if (tags.includes("contrast")) return "CONTRAST_MARKER";
  if (tags.includes("false-friend")) return "FALSE_FRIEND";
  if (tags.includes("synonym")) return "SYNONYM_TRAP";
  if (tags.includes("implicit")) return "IMPLICIT_MEANING";
  return undefined;
}
