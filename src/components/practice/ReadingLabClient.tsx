"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Eye,
  RotateCcw,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { PracticeFilterBar } from "@/components/practice/PracticeFilterBar";
import { PracticeProgressPanel } from "@/components/practice/PracticeProgressPanel";
import type {
  PracticeAttemptResponse,
  PracticeFilters,
  PracticeMode,
  PracticeQuestionListResponse,
} from "@/lib/practice/types";
import { formatCEFRLevel, formatExamType, formatTrapType } from "@/lib/utils";

type ReadingLabClientProps = {
  defaultExamType: PracticeFilters["examType"];
};

const defaultProgress = {
  skillAccuracy: 0,
  totalAttempted: 0,
  recentWeakTrapTypes: [],
};

export function ReadingLabClient({ defaultExamType }: ReadingLabClientProps) {
  const [mode, setMode] = useState<PracticeMode>("learning");
  const [filters, setFilters] = useState<PracticeFilters>({
    examType: defaultExamType,
    skill: "READING",
    level: "ALL",
    topic: "ALL",
    trapType: "ALL",
  });
  const [data, setData] = useState<PracticeQuestionListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<PracticeAttemptResponse | null>(null);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const items = data?.items ?? [];
  const progress = result?.progress ?? data?.progress ?? defaultProgress;
  const question = items[currentIndex] ?? null;
  const passage = question?.passage ?? null;

  useEffect(() => {
    let isMounted = true;

    const searchParams = new URLSearchParams({
      skill: filters.skill,
      examType: filters.examType,
      level: filters.level,
      topic: filters.topic,
      trapType: filters.trapType,
    });

    fetch(`/api/practice/questions?${searchParams.toString()}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Unable to load reading questions.");
        }

        return response.json() as Promise<PracticeQuestionListResponse>;
      })
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setData(payload);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setResult(null);
        setShowVocabulary(false);
        setQuestionStartedAt(Date.now());
        setElapsedSeconds(0);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load reading questions.",
        );
        setData(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [filters]);

  useEffect(() => {
    if (!question || result) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - questionStartedAt) / 1000)),
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, [question, questionStartedAt, result]);

  const progressWidth = useMemo(() => {
    if (!items.length) {
      return 0;
    }

    return ((currentIndex + 1) / items.length) * 100;
  }, [currentIndex, items.length]);

  const handleFiltersChange = (nextFilters: PracticeFilters) => {
    setIsLoading(true);
    setErrorMessage(null);
    setFilters(nextFilters);
  };

  const handleAnswer = async (answerIndex: number) => {
    if (!question || selectedAnswer !== null || isSubmitting) {
      return;
    }

    setSelectedAnswer(answerIndex);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/practice/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: question.id,
          selectedAnswerIndex: answerIndex,
          timeTakenSeconds: Math.max(1, elapsedSeconds || 1),
          mode,
        }),
      });

      const payload = (await response.json()) as
        | PracticeAttemptResponse
        | { error?: string };

      if (!response.ok || !("questionId" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to save your answer.",
        );
      }

      setResult(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save your answer.",
      );
      setSelectedAnswer(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextQuestion = () => {
    const nextIndex = currentIndex + 1;

    setCurrentIndex(nextIndex >= items.length ? 0 : nextIndex);
    setSelectedAnswer(null);
    setResult(null);
    setShowVocabulary(false);
    setQuestionStartedAt(Date.now());
    setElapsedSeconds(0);
  };

  return (
    <div className="space-y-6">
      <div className="surface-panel overflow-hidden rounded-[2rem] p-5 sm:p-7 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-skill-reading via-brand-green to-transparent" />
        <div>
          <div className="page-kicker mb-4">
            <Eye className="w-4 h-4" />
            Passage logic lab
          </div>
          <h1 className="display-title text-5xl sm:text-6xl flex items-center gap-2 mb-2">
            <BookOpen className="w-6 h-6 text-skill-reading" />
            Reading Lab
          </h1>
          <p className="text-sm text-text-secondary">
            Real exam passages, instant explanations, and trap-aware practice.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-full border border-border-default">
          <button
            type="button"
            onClick={() => setMode("learning")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "learning"
                ? "bg-brand-green/15 text-brand-green"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-1.5" />
            Learning
          </button>
          <button
            type="button"
            onClick={() => setMode("timed")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "timed"
                ? "bg-accent-amber/15 text-accent-amber"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1.5" />
            Timed
          </button>
        </div>
      </div>

      <PracticeProgressPanel
        progress={progress}
        accentClassName="text-skill-reading"
      />
      <PracticeFilterBar filters={filters} onChange={handleFiltersChange} />

      {isLoading ? (
        <div className="card p-8 text-sm text-text-muted">
          Loading reading questions...
        </div>
      ) : errorMessage ? (
        <div className="card p-8">
          <p className="text-sm text-accent-rose mb-4">{errorMessage}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleFiltersChange({ ...filters })}
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : !question ? (
        <div className="card p-8">
          <h2 className="text-lg font-semibold mb-2">
            No reading questions yet
          </h2>
          <p className="text-sm text-text-secondary">
            Try widening your filters or publish more reading questions in
            Supabase.
          </p>
        </div>
      ) : (
        <>
          <div className="card flex items-center gap-4 py-3 px-5">
            <span className="text-sm text-text-muted">
              Q{currentIndex + 1} / {items.length}
            </span>
            <div className="flex-1 progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progressWidth}%`,
                  background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                }}
              />
            </div>
            <span className="flex items-center gap-1 text-xs text-brand-green">
              <Zap className="w-3 h-3" /> +40 XP
            </span>
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Timer className="w-3 h-3" />
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              {passage ? (
                <>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">{passage.title}</h2>
                      <p className="text-xs text-text-muted mt-1">
                        {formatQuestionExamType(question.examType)}
                        {" · "}
                        {formatCEFRLevel(question.level)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {passage.estimatedMinutes ? (
                        <span className="badge badge-blue">
                          {passage.estimatedMinutes} min
                        </span>
                      ) : null}
                      {passage.wordCount ? (
                        <span className="badge badge-purple">
                          {passage.wordCount} words
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {passage.content.split(" ").map((word, index) => {
                      const cleanWord = word
                        .replace(/[.,;:!?]/g, "")
                        .toLowerCase();
                      const isHighlighted = passage.highlightedVocabulary.some(
                        (value) => value.toLowerCase() === cleanWord,
                      );

                      return (
                        <span key={`${word}-${index}`}>
                          {isHighlighted ? (
                            <span className="text-brand-green font-medium">
                              {word}
                            </span>
                          ) : (
                            word
                          )}{" "}
                        </span>
                      );
                    })}
                  </div>

                  {passage.highlightedVocabulary.length ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowVocabulary((current) => !current)}
                        className="mt-4 text-xs text-brand-green flex items-center gap-1 hover:underline"
                      >
                        <Eye className="w-3 h-3" />
                        {showVocabulary ? "Hide" : "Show"} highlighted
                        vocabulary
                      </button>

                      {showVocabulary ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {passage.highlightedVocabulary.map((word) => (
                            <span key={word} className="badge badge-green">
                              {word}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <div className="text-sm text-text-muted">
                  This question has no linked passage yet.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="badge badge-blue">
                    {formatCEFRLevel(question.level)}
                  </span>
                  {question.trapType ? (
                    <span className="badge badge-amber">
                      {formatTrapType(question.trapType)}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-medium mb-4">{question.prompt}</p>

                <div className="space-y-2">
                  {question.options.map((option, index) => {
                    const isCorrectAnswer = result?.correctAnswerIndex === index;
                    const isSelectedWrong =
                      selectedAnswer === index && result && !result.isCorrect;
                    let optionClass =
                      "bg-bg-input border-border-default hover:border-border-strong cursor-pointer";

                    if (result) {
                      if (isCorrectAnswer) {
                        optionClass =
                          "bg-status-success/10 border-status-success/30";
                      } else if (isSelectedWrong) {
                        optionClass = "bg-accent-rose/10 border-accent-rose/30";
                      } else {
                        optionClass =
                          "bg-bg-input border-border-default opacity-50";
                      }
                    }

                    return (
                      <button
                        key={`${question.id}-${index}`}
                        type="button"
                        onClick={() => void handleAnswer(index)}
                        disabled={selectedAnswer !== null || isSubmitting}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${optionClass}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-medium ${
                            isCorrectAnswer
                              ? "bg-status-success/20 text-status-success"
                              : isSelectedWrong
                                ? "bg-accent-rose/20 text-accent-rose"
                                : "bg-bg-elevated text-text-muted"
                          }`}
                        >
                          {isCorrectAnswer ? (
                            <Check className="w-3 h-3" />
                          ) : isSelectedWrong ? (
                            <X className="w-3 h-3" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </div>
                        <span className="text-sm">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {result ? (
                <div className="card p-5 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-2">
                    {result.isCorrect ? (
                      <Check className="w-5 h-5 text-status-success" />
                    ) : (
                      <X className="w-5 h-5 text-accent-rose" />
                    )}
                    <h3 className="text-sm font-semibold">
                      {result.isCorrect ? "Correct!" : "Incorrect"}
                    </h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {result.explanation ?? "Explanation not available yet."}
                  </p>
                  {result.trapType ? (
                    <span className="badge badge-amber mt-3 inline-block">
                      Trap: {formatTrapType(result.trapType)}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {selectedAnswer !== null ? (
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  className="btn btn-primary w-full"
                >
                  {currentIndex === items.length - 1
                    ? "Practice Again"
                    : "Next Question"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatQuestionExamType(examType: string) {
  if (examType === "BOTH") {
    return formatExamType("ALL_EXAMS");
  }

  if (
    examType === "TEF_CANADA" ||
    examType === "TCF_CANADA" ||
    examType === "MIXED"
  ) {
    return formatExamType(examType);
  }

  return examType;
}
