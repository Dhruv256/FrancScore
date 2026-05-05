"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Keyboard,
  Layers,
  RotateCcw,
  Trophy,
  Zap,
} from "lucide-react";
import {
  CEFR_LEVELS,
  EXAM_TYPES,
  FLASHCARD_DECK_LABELS,
  FLASHCARD_MODES,
  TOPIC_TYPES,
} from "@/lib/constants";
import type {
  FlashcardCard,
  FlashcardDeckFilter,
  FlashcardDeckResponse,
  FlashcardReviewAction,
  FlashcardReviewResult,
  FlashcardSessionResponse,
} from "@/lib/flashcards/types";
import type {
  CEFRLevel,
  ExamType,
  FlashcardReviewRating,
  FlashcardSession,
  TopicType,
  VocabularyStatus,
} from "@/lib/types";
import {
  formatCEFRLevel,
  formatExamType,
  formatTopicType,
  formatVocabularyStatus,
} from "@/lib/utils";

type FlashcardsPageClientProps = {
  defaultExamType: ExamType | "ALL";
};

const statusColors: Record<VocabularyStatus, { bg: string; text: string }> = {
  NEW: { bg: "bg-accent-blue/10", text: "text-accent-blue" },
  LEARNING: { bg: "bg-accent-amber/10", text: "text-accent-amber" },
  WEAK: { bg: "bg-accent-rose/10", text: "text-accent-rose" },
  MASTERED: { bg: "bg-status-success/10", text: "text-status-success" },
};

export function FlashcardsPageClient({
  defaultExamType,
}: FlashcardsPageClientProps) {
  const [filter, setFilter] = useState<FlashcardDeckFilter>({
    deckType: "ALL",
    cefrLevel: "ALL",
    topic: "ALL",
    examType: defaultExamType,
    status: "ALL",
  });
  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [session, setSession] = useState<FlashcardSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const searchParams = new URLSearchParams({
      deckType: filter.deckType,
      cefrLevel: filter.cefrLevel,
      topic: filter.topic,
      examType: filter.examType,
      status: filter.status,
    });

    fetch(`/api/flashcards/deck?${searchParams.toString()}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Unable to load flashcards.");
        }

        return response.json() as Promise<FlashcardDeckResponse>;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setCards(payload.cards);
        setCurrentIndex(0);
        setIsFlipped(false);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load flashcards.",
        );
        setCards([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [filter]);

  const currentCard = cards[currentIndex] ?? null;
  const progressWidth = useMemo(() => {
    if (!cards.length) {
      return 0;
    }

    return ((currentIndex + 1) / cards.length) * 100;
  }, [cards.length, currentIndex]);
  const handleReviewRef = useRef<
    (rating: FlashcardReviewRating, action: FlashcardReviewAction) => Promise<void>
  >(async () => {});

  const updateFilter = (updater: (current: FlashcardDeckFilter) => FlashcardDeckFilter) => {
    setIsLoading(true);
    setErrorMessage(null);
    setFilter(updater);
  };

  const stats = useMemo(() => {
    const mastered = cards.filter((card) => card.status === "MASTERED").length;
    const weak = cards.filter((card) => card.status === "WEAK").length;
    const learning = cards.filter((card) => card.status === "LEARNING").length;
    const newCount = cards.filter((card) => card.status === "NEW").length;
    return {
      total: cards.length,
      mastered,
      weak,
      learning,
      newCount,
    };
  }, [cards]);

  const beginSession = async () => {
    if (!cards.length || isStarting) {
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/flashcards/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deckType: filter.deckType,
          totalCards: cards.length,
        }),
      });

      const payload = (await response.json()) as
        | FlashcardSessionResponse
        | { error?: string };

      if (!response.ok || !("sessionId" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to start flashcard session.",
        );
      }

      setSession({
        id: payload.sessionId,
        deckType: filter.deckType,
        totalCards: cards.length,
        reviewed: 0,
        mastered: 0,
        weakAdded: 0,
        xpEarned: 0,
        masteryImprovement: 0,
        reviews: [],
        startedAt: new Date().toISOString(),
      });
      setStarted(true);
      setSessionComplete(false);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start flashcard session.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleReview = async (
    rating: FlashcardReviewRating,
    action: FlashcardReviewAction,
  ) => {
    if (!session?.id || !currentCard || isReviewing) {
      return;
    }

    setIsReviewing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/flashcards/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          vocabularyId: currentCard.id,
          rating,
          action,
        }),
      });

      const payload = (await response.json()) as
        | FlashcardReviewResult
        | { error?: string };

      if (!response.ok || !("vocabularyId" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to save flashcard review.",
        );
      }

      const previousStatus = currentCard.status;
      const nextStatus = payload.status;
      const masteredIncrement =
        nextStatus === "MASTERED" && previousStatus !== "MASTERED" ? 1 : 0;
      const weakIncrement =
        nextStatus === "WEAK" && previousStatus !== "WEAK" ? 1 : 0;

      setCards((previousCards) =>
        previousCards.map((card) =>
          card.id === currentCard.id
            ? {
                ...card,
                status: nextStatus,
                reviewCount: payload.reviewCount,
                correctCount: payload.correctCount,
                mistakeCount: payload.mistakeCount,
                nextReviewAt: payload.nextReviewAt,
                lastReviewedAt: new Date().toISOString(),
                isWeakWord: nextStatus === "WEAK",
                isMastered: nextStatus === "MASTERED",
              }
            : card,
        ),
      );

      setSession((previousSession) => {
        if (!previousSession) {
          return previousSession;
        }

        return {
          ...previousSession,
          reviewed: previousSession.reviewed + 1,
          mastered: previousSession.mastered + masteredIncrement,
          weakAdded: previousSession.weakAdded + weakIncrement,
          xpEarned: previousSession.xpEarned + payload.xpEarned,
          masteryImprovement:
            previousSession.masteryImprovement + masteredIncrement * 0.5,
          reviews: [
            ...previousSession.reviews,
            {
              wordId: currentCard.id,
              rating,
              reviewedAt: new Date().toISOString(),
              xpEarned: payload.xpEarned,
              previousStatus,
              nextStatus,
            },
          ],
        };
      });

      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        setSessionComplete(true);
        await fetch("/api/flashcards/session", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: session.id,
          }),
        });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save flashcard review.",
      );
    } finally {
      setIsReviewing(false);
    }
  };

  const resetSession = () => {
    setStarted(false);
    setSessionComplete(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSession(null);
  };

  useEffect(() => {
    handleReviewRef.current = handleReview;
  });

  useEffect(() => {
    if (!started || !session || sessionComplete) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setIsFlipped((current) => !current);
        return;
      }

      if (!isFlipped || isReviewing || !currentCard) {
        return;
      }

      if (event.key === "1") {
        void handleReviewRef.current("AGAIN", "RATE");
      } else if (event.key === "2") {
        void handleReviewRef.current("HARD", "RATE");
      } else if (event.key === "3") {
        void handleReviewRef.current("GOOD", "RATE");
      } else if (event.key === "4") {
        void handleReviewRef.current("EASY", "RATE");
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [started, session, sessionComplete, isFlipped, isReviewing, currentCard]);

  if (!started) {
    return (
      <div className="space-y-6">
        <div className="surface-panel overflow-hidden rounded-[2rem] p-5 sm:p-7">
          <div className="absolute inset-x-0 top-0 h-px gradient-purple" />
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="page-kicker mb-4">
              <Layers className="w-4 h-4" />
              Unlimited spaced repetition
            </div>
            <h1 className="display-title text-5xl sm:text-6xl flex items-center gap-2 mb-2">
              <Layers className="w-6 h-6 text-brand-purple" />
              Flashcards
            </h1>
            <p className="text-sm text-text-secondary">
              Practice core TEF/TCF vocabulary with real spaced repetition.
            </p>
          </div>
          <Link href="/vocabulary" className="btn btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Back to Vocabulary
          </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card text-center py-4">
            <div className="text-3xl font-black text-accent-blue">{stats.newCount}</div>
            <div className="text-xs font-bold text-text-muted">New</div>
          </div>
          <div className="card text-center py-4">
            <div className="text-3xl font-black text-accent-amber">{stats.learning}</div>
            <div className="text-xs font-bold text-text-muted">Learning</div>
          </div>
          <div className="card text-center py-4">
            <div className="text-3xl font-black text-accent-rose">{stats.weak}</div>
            <div className="text-xs font-bold text-text-muted">Weak</div>
          </div>
          <div className="card text-center py-4">
            <div className="text-3xl font-black text-status-success">{stats.mastered}</div>
            <div className="text-xs font-bold text-text-muted">Mastered</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FLASHCARD_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() =>
                updateFilter((current) => ({ ...current, deckType: mode.id }))
              }
              className={`card min-h-36 text-left transition-all ${
                filter.deckType === mode.id
                  ? "border-brand-purple/40 bg-brand-purple/5"
                  : ""
              }`}
            >
              <div className="text-xl mb-2">{mode.emoji}</div>
              <h3 className="text-sm font-black">{mode.label}</h3>
              <p className="text-xs text-text-muted mt-1">
                {filter.deckType === mode.id ? cards.length : ""}
                {filter.deckType === mode.id ? " cards ready" : "Choose this deck"}
              </p>
            </button>
          ))}
        </div>

        <div className="surface-panel rounded-[2rem] p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-text-muted">CEFR</span>
              <select
                className="input"
                value={filter.cefrLevel}
                onChange={(event) =>
                  updateFilter((current) => ({
                    ...current,
                    cefrLevel: event.target.value as CEFRLevel | "ALL",
                  }))
                }
              >
                <option value="ALL">All levels</option>
                {CEFR_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {formatCEFRLevel(level)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-text-muted">Topic</span>
              <select
                className="input"
                value={filter.topic}
                onChange={(event) =>
                  updateFilter((current) => ({
                    ...current,
                    topic: event.target.value as TopicType | "ALL",
                  }))
                }
              >
                <option value="ALL">All topics</option>
                {TOPIC_TYPES.map((topic) => (
                  <option key={topic} value={topic}>
                    {formatTopicType(topic)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-text-muted">Exam</span>
              <select
                className="input"
                value={filter.examType}
                onChange={(event) =>
                  updateFilter((current) => ({
                    ...current,
                    examType: event.target.value as ExamType | "ALL",
                  }))
                }
              >
                <option value="ALL">All exams</option>
                {EXAM_TYPES.map((examType) => (
                  <option key={examType} value={examType}>
                    {formatExamType(examType)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-text-muted">Status</span>
              <select
                className="input"
                value={filter.status}
                onChange={(event) =>
                  updateFilter((current) => ({
                    ...current,
                    status: event.target.value as VocabularyStatus | "ALL",
                  }))
                }
              >
                <option value="ALL">All statuses</option>
                <option value="NEW">New</option>
                <option value="LEARNING">Learning</option>
                <option value="WEAK">Weak</option>
                <option value="MASTERED">Mastered</option>
              </select>
            </label>
          </div>
        </div>

        <div className="card p-5 flex items-start gap-3">
          <Keyboard className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              <div>`Space` Flip card</div>
              <div>`1` Again</div>
              <div>`2` Hard</div>
              <div>`3` Good</div>
              <div>`4` Easy</div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="card p-5 text-sm text-accent-rose">{errorMessage}</div>
        ) : null}

        {isLoading ? (
          <div className="card p-12 text-center text-sm text-text-muted">
            Loading flashcards...
          </div>
        ) : filter.deckType === "CUSTOM" ? (
          <div className="card p-12 text-center">
            <Layers className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-25" />
            <h3 className="text-base font-semibold mb-2">Custom Deck Coming Soon</h3>
            <p className="text-sm text-text-secondary">
              This placeholder is ready for saved decks once deck-builder flows are added.
            </p>
          </div>
        ) : !cards.length ? (
          <div className="card p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-25" />
            <h3 className="text-base font-semibold mb-2">No cards match these filters</h3>
            <p className="text-sm text-text-secondary">
              Try a broader deck or reset one of the CEFR, topic, exam, or status filters.
            </p>
          </div>
        ) : (
          <div className="surface-panel rounded-[2rem] p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-sm text-text-muted mb-1">
                Selected Deck
              </div>
              <div className="text-2xl font-black">
                {FLASHCARD_DECK_LABELS[filter.deckType]}
              </div>
              <div className="text-sm text-text-secondary mt-1">
                {cards.length} cards ready for review
              </div>
            </div>
            <button
              type="button"
              onClick={() => void beginSession()}
              disabled={isStarting}
              className="btn btn-primary btn-lg w-full sm:w-auto"
            >
              <Layers className="w-5 h-5" />
              {isStarting ? "Starting..." : `Start Flashcards (${cards.length})`}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (sessionComplete && session) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="surface-panel p-8 text-center card-glow-green rounded-[2rem]">
          <Trophy className="w-16 h-16 text-accent-amber mx-auto mb-4" />
          <h2 className="text-4xl font-black mb-2">Session Complete</h2>
          <p className="text-sm text-text-secondary mb-6">
            You reviewed the full deck and updated your spaced repetition queue.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatBox label="Cards Reviewed" value={session.reviewed} />
            <StatBox label="Mastered" value={session.mastered} accent="text-status-success" />
            <StatBox label="Weak Words" value={session.weakAdded} accent="text-accent-rose" />
            <StatBox label="XP Earned" value={session.xpEarned} accent="text-brand-green" icon />
          </div>

          <div className="p-3 rounded-xl bg-brand-green/5 border border-brand-green/20 mb-6">
            <div className="text-sm font-medium text-brand-green">
              Vocabulary Mastery +{session.masteryImprovement.toFixed(1)}%
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={resetSession} className="btn btn-secondary w-full sm:w-auto">
              <RotateCcw className="w-4 h-4" />
              New Session
            </button>
            <Link href="/vocabulary" className="btn btn-primary w-full sm:w-auto">
              Back to Vocabulary
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard || !session) {
    return null;
  }

  const currentStatusColor = statusColors[currentCard.status];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button onClick={resetSession} className="btn btn-ghost btn-sm">
          <ArrowLeft className="w-4 h-4" />
          Exit
        </button>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <span className="text-sm text-text-muted">
            {currentIndex + 1} / {cards.length}
          </span>
          <span className="badge badge-purple">{FLASHCARD_DECK_LABELS[session.deckType]}</span>
          <span className="flex items-center gap-1 text-xs text-brand-green">
            <Zap className="w-3 h-3" />
            {session.xpEarned} XP
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatMini label="Reviewed" value={session.reviewed} />
        <StatMini label="Weak Added" value={session.weakAdded} accent="text-accent-rose" />
        <StatMini label="Mastered" value={session.mastered} accent="text-status-success" />
        <StatMini label="XP" value={session.xpEarned} accent="text-brand-green" />
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill progress-fill-purple"
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      <button
        type="button"
        className="flashcard-container cursor-pointer text-left w-full"
        onClick={() => setIsFlipped((current) => !current)}
        style={{ minHeight: "430px" }}
      >
        <div
          className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}
          style={{ minHeight: "430px" }}
        >
          <div
            className="flashcard-front surface-panel card-glow-purple p-8 flex flex-col items-center justify-center text-center"
            style={{ minHeight: "430px" }}
          >
            <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
              <span className="badge badge-blue">{formatCEFRLevel(currentCard.cefrLevel)}</span>
              {currentCard.topic ? (
                <span className="badge badge-purple">{formatTopicType(currentCard.topic)}</span>
              ) : null}
              <span className={`badge ${currentStatusColor.bg} ${currentStatusColor.text} border-none`}>
                {formatVocabularyStatus(currentCard.status)}
              </span>
            </div>
            <h2 className="display-title text-6xl sm:text-7xl mb-5 gradient-text-hero break-words">
              {currentCard.frenchWord}
            </h2>
            <p className="text-sm font-bold text-text-muted">Tap the card or press Space to flip</p>
          </div>

          <div className="flashcard-back surface-panel p-6 sm:p-8" style={{ minHeight: "430px" }}>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="badge badge-blue">{formatCEFRLevel(currentCard.cefrLevel)}</span>
              {currentCard.topic ? (
                <span className="badge badge-purple">{formatTopicType(currentCard.topic)}</span>
              ) : null}
              <span className={`badge ${currentStatusColor.bg} ${currentStatusColor.text} border-none`}>
                {formatVocabularyStatus(currentCard.status)}
              </span>
              <span className="badge badge-green">{formatCardExamType(currentCard.examType)}</span>
            </div>

            <h3 className="text-4xl font-black mb-4">{currentCard.frenchWord}</h3>

            <div className="mb-5">
              <span className="text-xs text-text-muted uppercase tracking-wider">Meaning</span>
              <p className="text-2xl text-brand-green font-black">{currentCard.englishMeaning}</p>
            </div>

            <div className="p-5 rounded-3xl bg-white/[0.055] border border-white/10 space-y-3">
              {currentCard.frenchExample ? (
                <p className="text-sm text-text-secondary">
                  <span className="text-xs text-brand-green font-medium mr-2">FR:</span>
                  {currentCard.frenchExample}
                </p>
              ) : (
                <p className="text-sm text-text-muted">No French example yet.</p>
              )}

              {currentCard.englishExampleTranslation ? (
                <p className="text-sm text-text-muted">
                  <span className="text-xs text-accent-blue font-medium mr-2">EN:</span>
                  {currentCard.englishExampleTranslation}
                </p>
              ) : (
                <p className="text-sm text-text-muted">No English translation yet.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {currentCard.tags.map((tag) => (
                <span key={tag} className="badge badge-purple text-[10px]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>

      {isFlipped ? (
        <div className="space-y-3 animate-fade-in-up">
          {errorMessage ? (
            <div className="card p-4 text-sm text-accent-rose">{errorMessage}</div>
          ) : null}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <ReviewButton
              label="Again"
              shortcut="1"
              className="bg-accent-rose/10 text-accent-rose border border-accent-rose/20 hover:bg-accent-rose/20"
              onClick={() => void handleReview("AGAIN", "RATE")}
              disabled={isReviewing}
            />
            <ReviewButton
              label="Hard"
              shortcut="2"
              className="bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/20"
              onClick={() => void handleReview("HARD", "RATE")}
              disabled={isReviewing}
            />
            <ReviewButton
              label="Good"
              shortcut="3"
              className="bg-brand-green/10 text-brand-green border border-brand-green/20 hover:bg-brand-green/20"
              onClick={() => void handleReview("GOOD", "RATE")}
              disabled={isReviewing}
            />
            <ReviewButton
              label="Easy"
              shortcut="4"
              className="bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20"
              onClick={() => void handleReview("EASY", "RATE")}
              disabled={isReviewing}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void handleReview("GOOD", "MARK_MASTERED")}
              disabled={isReviewing}
              className="btn btn-ghost btn-sm text-status-success"
            >
              <Check className="w-3.5 h-3.5" />
              Mark as Mastered (+10 XP bonus)
            </button>
            <button
              type="button"
              onClick={() => void handleReview("AGAIN", "SAVE_WEAK")}
              disabled={isReviewing}
              className="btn btn-ghost btn-sm text-accent-rose"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Save to Weak Words
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent?: string;
  icon?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl bg-bg-input">
      <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${accent ?? ""}`}>
        {icon ? <Zap className="w-5 h-5" /> : null}
        {value}
      </div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

function StatMini({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="card text-center py-3">
      <div className={`text-2xl font-bold ${accent ?? ""}`}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

function ReviewButton({
  label,
  shortcut,
  className,
  onClick,
  disabled,
}: {
  label: string;
  shortcut: string;
  className: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn flex-col py-3 h-auto ${className}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[10px] opacity-60 mt-0.5">{shortcut}</span>
    </button>
  );
}

function formatCardExamType(examType: string) {
  if (examType === "BOTH") {
    return "Both";
  }

  if (examType === "TEF_CANADA" || examType === "TCF_CANADA" || examType === "MIXED") {
    return formatExamType(examType);
  }

  return examType;
}
