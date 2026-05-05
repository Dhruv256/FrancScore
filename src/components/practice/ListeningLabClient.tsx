"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Headphones,
  RotateCcw,
  Timer,
  Volume2,
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
import { formatCEFRLevel, formatTrapType } from "@/lib/utils";

type ListeningLabClientProps = {
  defaultExamType: PracticeFilters["examType"];
};

const defaultProgress = {
  skillAccuracy: 0,
  totalAttempted: 0,
  recentWeakTrapTypes: [],
};

export function ListeningLabClient({
  defaultExamType,
}: ListeningLabClientProps) {
  const [mode, setMode] = useState<PracticeMode>("learning");
  const [filters, setFilters] = useState<PracticeFilters>({
    examType: defaultExamType,
    skill: "LISTENING",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const items = data?.items ?? [];
  const progress = result?.progress ?? data?.progress ?? defaultProgress;
  const question = items[currentIndex] ?? null;

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
          throw new Error(payload.error ?? "Unable to load listening questions.");
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
            : "Unable to load listening questions.",
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
    setQuestionStartedAt(Date.now());
    setElapsedSeconds(0);
  };

  return (
    <div className="space-y-6">
      <div className="surface-panel overflow-hidden rounded-[2rem] p-5 sm:p-7 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-skill-listening via-accent-cyan to-transparent" />
        <div>
          <div className="page-kicker mb-4">
            <Volume2 className="w-4 h-4" />
            Audio trap lab
          </div>
          <h1 className="display-title text-5xl sm:text-6xl flex items-center gap-2 mb-2">
            <Headphones className="w-6 h-6 text-skill-listening" />
            Listening Lab
          </h1>
          <p className="text-sm text-text-secondary">
            Listen, answer, and review the exact trap you missed.
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
        accentClassName="text-skill-listening"
      />
      <PracticeFilterBar filters={filters} onChange={handleFiltersChange} />

      {isLoading ? (
        <div className="card p-8 text-sm text-text-muted">
          Loading listening questions...
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
            No listening questions yet
          </h2>
          <p className="text-sm text-text-secondary">
            Try broader filters or publish listening items with audio metadata.
          </p>
        </div>
      ) : (
        <>
          <div className="card flex items-center gap-4 py-3 px-5">
            <span className="text-sm text-text-muted">
              Question {currentIndex + 1} / {items.length}
            </span>
            <div className="flex-1 progress-bar">
              <div
                className="progress-fill progress-fill-purple"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            <span className="flex items-center gap-1 text-xs text-brand-green">
              <Zap className="w-3 h-3" /> +50 XP
            </span>
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Timer className="w-3 h-3" />
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-skill-listening" />
                    <span className="text-sm font-medium">Audio Prompt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-blue">
                      {formatCEFRLevel(question.level)}
                    </span>
                    {question.trapType ? (
                      <span className="badge badge-amber">
                        {formatTrapType(question.trapType)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {question.audioUrl ? (
                  <audio controls className="w-full mb-4">
                    <source src={question.audioUrl} />
                    Your browser does not support the audio player.
                  </audio>
                ) : (
                  <div className="mb-4 rounded-xl border border-border-default bg-bg-input p-4 text-sm text-text-muted">
                    No audio file is attached yet. You can still answer using
                    the question metadata.
                  </div>
                )}

                <p className="text-sm font-medium leading-relaxed">
                  {question.prompt}
                </p>
              </div>

              <div className="space-y-2">
                {question.options.map((option, index) => {
                  const isCorrectAnswer = result?.correctAnswerIndex === index;
                  const isSelectedWrong =
                    selectedAnswer === index && result && !result.isCorrect;
                  let optionClass =
                    "bg-bg-card border-border-default hover:border-border-strong cursor-pointer";

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
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${optionClass}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-medium ${
                          isCorrectAnswer
                            ? "bg-status-success/20 text-status-success"
                            : isSelectedWrong
                              ? "bg-accent-rose/20 text-accent-rose"
                              : "bg-bg-elevated text-text-muted"
                        }`}
                      >
                        {isCorrectAnswer ? (
                          <Check className="w-4 h-4" />
                        ) : isSelectedWrong ? (
                          <X className="w-4 h-4" />
                        ) : (
                          String.fromCharCode(65 + index)
                        )}
                      </div>
                      <span className="text-sm">{option}</span>
                    </button>
                  );
                })}
              </div>

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

            <div className="space-y-4">
              {result ? (
                <>
                  <div className="card p-5">
                    <div className="flex items-center gap-2 mb-3">
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

                  {result.transcript ? (
                    <div className="card p-5">
                      <h3 className="text-sm font-semibold mb-3">
                        Transcript
                      </h3>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                        {result.transcript}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-amber" />
                    Trap Focus
                  </h3>
                  <p className="text-sm text-text-secondary">
                    The transcript stays hidden until you answer. Listen for
                    corrections, negation, and contrast markers before you
                    commit.
                  </p>
                </div>
              )}

              <div className="card p-5">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Question Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {question.tags.map((tag) => (
                    <span key={tag} className="badge badge-purple text-xs">
                      {tag}
                    </span>
                  ))}
                  <span className="badge badge-blue text-xs">
                    {formatCEFRLevel(question.level)}
                  </span>
                  <span className="badge badge-amber text-xs">
                    {question.difficulty}
                  </span>
                </div>
              </div>
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
