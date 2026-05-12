import "server-only";

import { applyXpAndStreak, XP_REWARDS } from "@/lib/gamification/xp";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type {
  FlashcardCard,
  FlashcardDeckFilter,
  FlashcardDeckResponse,
  FlashcardReviewPayload,
  FlashcardReviewResult,
  FlashcardSessionPayload,
  FlashcardSessionResponse,
} from "@/lib/flashcards/types";
import type {
  CEFRLevel,
  FlashcardDeckType,
  FlashcardReviewRating,
  TopicType,
  TrapType,
  VocabularyStatus,
} from "@/lib/types";

type VocabularyRow = Database["public"]["Tables"]["vocabulary"]["Row"];
type WordBankRow = Database["public"]["Tables"]["user_word_bank"]["Row"];

const HIGH_FREQUENCY_THRESHOLD = 85;

export async function getFlashcardDeck(
  userId: string,
  filter: FlashcardDeckFilter,
): Promise<FlashcardDeckResponse> {
  const supabase = await createClient();
  const { data: vocabularyRows, error: vocabularyError } = await supabase
    .from("vocabulary")
    .select("*")
    .eq("is_published", true)
    .order("frequency_score", { ascending: false })
    .order("french_word", { ascending: true })
    .limit(300);

  if (vocabularyError) {
    throw new Error(vocabularyError.message);
  }

  const { data: wordBankRows, error: wordBankError } = await supabase
    .from("user_word_bank")
    .select("*")
    .eq("user_id", userId);

  if (wordBankError) {
    throw new Error(wordBankError.message);
  }

  const wordBankMap = new Map(
    (wordBankRows ?? []).map((row) => [row.vocabulary_id, row]),
  );

  const cards = (vocabularyRows ?? [])
    .filter(isFlashcardVocabularyRow)
    .map((row) => mapFlashcardCard(row, wordBankMap.get(row.id)))
    .filter((card) => matchesDeckType(card, filter.deckType))
    .filter((card) => matchesFilters(card, filter))
    .sort((left, right) => compareCards(left, right, filter.deckType));

  return {
    cards,
    filter,
  };
}

function isFlashcardVocabularyRow(row: VocabularyRow) {
  const tags = row.tags ?? [];
  return !["bad-import", "grammar-concept", "section-heading", "study-schedule"].some((tag) =>
    tags.includes(tag),
  );
}

export async function startFlashcardSession(
  userId: string,
  payload: FlashcardSessionPayload,
): Promise<FlashcardSessionResponse> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flashcard_sessions")
    .insert({
      user_id: userId,
      deck_type: payload.deckType,
      cards_reviewed: 0,
      mastered_count: 0,
      weak_count: 0,
      xp_earned: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to start flashcard session.");
  }

  return {
    sessionId: data.id,
  };
}

export async function completeFlashcardSession(sessionId: string) {
  const supabase = await createClient();
  await supabase
    .from("flashcard_sessions")
    .update({
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

export async function reviewFlashcard(
  userId: string,
  payload: FlashcardReviewPayload,
): Promise<FlashcardReviewResult> {
  const supabase = await createClient();
  const { data: existingRow, error: existingError } = await supabase
    .from("user_word_bank")
    .select("*")
    .eq("user_id", userId)
    .eq("vocabulary_id", payload.vocabularyId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const previousStatus = normalizeVocabularyStatus(existingRow?.status) ?? "NEW";
  const nextState = computeNextReviewState(existingRow, payload.rating, payload.action);
  const xpEarned =
    payload.action === "SKIP"
      ? 0
      : payload.action === "MARK_MASTERED"
        ? XP_REWARDS.FLASHCARD_REVIEW + XP_REWARDS.FLASHCARD_MASTERED_BONUS
        : XP_REWARDS.FLASHCARD_REVIEW;
  const nowIso = new Date().toISOString();

  const upsertPayload: Database["public"]["Tables"]["user_word_bank"]["Insert"] = {
    id: existingRow?.id,
    user_id: userId,
    vocabulary_id: payload.vocabularyId,
    status: nextState.status.toLowerCase(),
    ease_score: nextState.easeScore,
    review_count: nextState.reviewCount,
    mistake_count: nextState.mistakeCount,
    correct_count: nextState.correctCount,
    last_reviewed_at: nowIso,
    next_review_at: nextState.nextReviewAt,
  };

  const { error: upsertError } = await supabase.from("user_word_bank").upsert(
    upsertPayload,
    {
      onConflict: "user_id,vocabulary_id",
    },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { error: reviewError } = await supabase.from("flashcard_reviews").insert({
    session_id: payload.sessionId,
    user_id: userId,
    vocabulary_id: payload.vocabularyId,
    rating: payload.rating.toLowerCase(),
    previous_status: previousStatus.toLowerCase(),
    new_status: nextState.status.toLowerCase(),
    xp_earned: xpEarned,
    reviewed_at: nowIso,
  });

  if (reviewError) {
    throw new Error(reviewError.message);
  }

  if (xpEarned > 0) {
    await applyXpAndStreak(userId, xpEarned, nowIso);
  }
  await updateSessionStats(
    payload.sessionId,
    xpEarned,
    nextState.status,
    previousStatus,
    payload.action === "SKIP",
  );

  return {
    vocabularyId: payload.vocabularyId,
    xpEarned,
    status: nextState.status,
    nextReviewAt: nextState.nextReviewAt,
    correctCount: nextState.correctCount,
    mistakeCount: nextState.mistakeCount,
    reviewCount: nextState.reviewCount,
  };
}

async function updateSessionStats(
  sessionId: string,
  xpEarned: number,
  nextStatus: VocabularyStatus,
  previousStatus: VocabularyStatus,
  isSkipped = false,
) {
  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("flashcard_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    throw new Error(error?.message ?? "Unable to update flashcard session.");
  }

  const masteredIncrement =
    nextStatus === "MASTERED" && previousStatus !== "MASTERED" ? 1 : 0;
  const weakIncrement = nextStatus === "WEAK" && previousStatus !== "WEAK" ? 1 : 0;

  const { error: updateError } = await supabase
    .from("flashcard_sessions")
    .update({
      cards_reviewed: session.cards_reviewed + (isSkipped ? 0 : 1),
      mastered_count: session.mastered_count + masteredIncrement,
      weak_count: session.weak_count + weakIncrement,
      xp_earned: session.xp_earned + xpEarned,
    })
    .eq("id", sessionId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

function mapFlashcardCard(
  row: VocabularyRow,
  wordBankRow?: WordBankRow,
): FlashcardCard {
  const status = normalizeVocabularyStatus(wordBankRow?.status) ?? "NEW";
  const tags = row.tags ?? [];
  const trapType = inferTrapType(tags);

  return {
    id: row.id,
    frenchWord: row.french_word,
    englishMeaning: row.english_meaning,
    frenchExample: row.french_example,
    englishExampleTranslation: row.english_example_translation,
    cefrLevel: row.cefr_level as CEFRLevel,
    topic: normalizeTopic(row.topic),
    examType: row.exam_type,
    frequencyScore: row.frequency_score,
    tags,
    status,
    reviewCount: wordBankRow?.review_count ?? 0,
    easeScore: wordBankRow?.ease_score ?? 2.5,
    nextReviewAt: wordBankRow?.next_review_at ?? null,
    lastReviewedAt: wordBankRow?.last_reviewed_at ?? null,
    correctCount: wordBankRow?.correct_count ?? 0,
    mistakeCount: wordBankRow?.mistake_count ?? 0,
    isWeakWord: status === "WEAK",
    isMastered: status === "MASTERED",
    trapType,
  };
}

function matchesDeckType(card: FlashcardCard, deckType: FlashcardDeckType) {
  switch (deckType) {
    case "ALL":
      return true;
    case "WEAK_WORDS":
      return card.status === "WEAK";
    case "HIGH_FREQUENCY":
      return card.frequencyScore >= HIGH_FREQUENCY_THRESHOLD;
    case "TOPIC":
      return true;
    case "TRAP_WORDS":
      return card.tags.some((tag) => tag.includes("trap")) || Boolean(card.trapType);
    case "CONNECTORS":
      return card.tags.includes("connector");
    case "LISTENING_TRAPS":
      return (
        card.tags.includes("listening-trap") ||
        card.tags.includes("number") ||
        card.tags.includes("negation") ||
        card.tags.includes("double-negative") ||
        card.trapType === "NEGATION" ||
        card.trapType === "NUMBER_DATE"
      );
    case "CUSTOM":
      return false;
    default:
      return true;
  }
}

function matchesFilters(card: FlashcardCard, filter: FlashcardDeckFilter) {
  if (filter.cefrLevel !== "ALL" && card.cefrLevel !== filter.cefrLevel) {
    return false;
  }

  if (filter.topic !== "ALL" && card.topic !== filter.topic) {
    return false;
  }

  if (
    filter.examType !== "ALL" &&
    card.examType !== "BOTH" &&
    card.examType !== filter.examType
  ) {
    return false;
  }

  if (filter.status !== "ALL" && card.status !== filter.status) {
    return false;
  }

  return true;
}

function compareCards(
  left: FlashcardCard,
  right: FlashcardCard,
  deckType: FlashcardDeckType,
) {
  if (deckType === "HIGH_FREQUENCY") {
    return right.frequencyScore - left.frequencyScore;
  }

  if (deckType === "WEAK_WORDS") {
    return left.mistakeCount === right.mistakeCount
      ? left.frenchWord.localeCompare(right.frenchWord)
      : right.mistakeCount - left.mistakeCount;
  }

  const leftDue = left.nextReviewAt ? new Date(left.nextReviewAt).getTime() : 0;
  const rightDue = right.nextReviewAt ? new Date(right.nextReviewAt).getTime() : 0;

  if (leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  return left.frenchWord.localeCompare(right.frenchWord);
}

function computeNextReviewState(
  row: WordBankRow | null,
  rating: FlashcardReviewRating,
  action: FlashcardReviewPayload["action"],
) {
  const previousStatus = normalizeVocabularyStatus(row?.status) ?? "NEW";

  if (action === "SKIP") {
    return {
      status: previousStatus,
      nextReviewAt: new Date(Date.now() + 60 * 24 * 60 * 1000).toISOString(),
      correctCount: row?.correct_count ?? 0,
      mistakeCount: row?.mistake_count ?? 0,
      reviewCount: row?.review_count ?? 0,
      easeScore: row?.ease_score ?? 2.5,
    };
  }

  const reviewCount = (row?.review_count ?? 0) + 1;
  const correctCount =
    (row?.correct_count ?? 0) + (rating === "AGAIN" || action === "SAVE_WEAK" ? 0 : 1);
  const mistakeCount =
    (row?.mistake_count ?? 0) + (rating === "AGAIN" || action === "SAVE_WEAK" ? 1 : 0);
  let easeScore = row?.ease_score ?? 2.5;
  let minutes = 10;
  let status: VocabularyStatus = previousStatus;

  switch (action) {
    case "MARK_MASTERED":
      status = "MASTERED";
      minutes = 60 * 24 * 7;
      easeScore = Math.min(4.5, easeScore + 0.4);
      break;
    case "SAVE_WEAK":
      status = "WEAK";
      minutes = 10;
      easeScore = Math.max(1.3, easeScore - 0.4);
      break;
    default:
      if (rating === "AGAIN") {
        status = "WEAK";
        minutes = 10;
        easeScore = Math.max(1.3, easeScore - 0.3);
      } else if (rating === "HARD") {
        status = "LEARNING";
        minutes = 60 * 24;
        easeScore = Math.max(1.5, easeScore - 0.1);
      } else if (rating === "GOOD") {
        status = "LEARNING";
        minutes = 60 * 24 * 3;
        easeScore = Math.min(4, easeScore + 0.05);
      } else {
        status = correctCount >= 3 ? "MASTERED" : "LEARNING";
        minutes = 60 * 24 * 7;
        easeScore = Math.min(4.5, easeScore + 0.2);
      }
  }

  return {
    status,
    nextReviewAt: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
    correctCount,
    mistakeCount,
    reviewCount,
    easeScore,
  };
}

function normalizeVocabularyStatus(value?: string | null): VocabularyStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase();
  if (
    normalized === "NEW" ||
    normalized === "LEARNING" ||
    normalized === "WEAK" ||
    normalized === "MASTERED"
  ) {
    return normalized;
  }

  return null;
}

function normalizeTopic(value: string | null): TopicType | null {
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

  return null;
}

function inferTrapType(tags: string[]): TrapType | null {
  if (tags.includes("negation") || tags.includes("double-negative")) {
    return "NEGATION";
  }
  if (tags.includes("number") || tags.includes("time") || tags.includes("date")) {
    return "NUMBER_DATE";
  }
  if (tags.includes("contrast")) {
    return "CONTRAST_MARKER";
  }
  if (tags.includes("false-friend")) {
    return "FALSE_FRIEND";
  }
  if (tags.includes("synonym")) {
    return "SYNONYM_TRAP";
  }
  if (tags.includes("implicit")) {
    return "IMPLICIT_MEANING";
  }

  return null;
}
