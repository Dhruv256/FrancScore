"use client";

import { useState } from "react";
import { Sparkles, Zap } from "lucide-react";

type DailyVocabSummary = {
  insertedCount: number;
  skippedDuplicateCount: number;
  failedCount: number;
  status: string;
  message: string;
};

export function GenerateDailyVocabButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/vocabulary/generate-daily", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as DailyVocabSummary | { error?: string };

      if (!response.ok || isErrorPayload(payload)) {
        throw new Error(isErrorPayload(payload) ? payload.error : "Unable to generate vocabulary.");
      }

      if (!isSummaryPayload(payload)) {
        throw new Error("The vocabulary generation response was incomplete.");
      }

      setMessage(
        `${payload.message} Inserted ${payload.insertedCount}, duplicates skipped ${payload.skippedDuplicateCount}, failed ${payload.failedCount}.`,
      );
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Unable to generate today's AI vocabulary.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="card-soft rounded-[2rem] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="page-kicker mb-2">
            <Sparkles className="h-4 w-4" />
            Daily AI vocabulary
          </p>
          <h2 className="text-xl font-black text-text-primary">Generate Today&apos;s 50 Words</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Creates published TEF/TCF flashcards with meanings, examples, translations, tags, and dedupe.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={isGenerating}
          className="btn btn-primary"
        >
          <Zap className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Today's 50 AI Words"}
        </button>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-status-success/10 p-3 text-sm text-status-success">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-accent-rose/10 p-3 text-sm text-accent-rose">{error}</p> : null}
    </div>
  );
}

function isErrorPayload(payload: DailyVocabSummary | { error?: string }): payload is { error: string } {
  return typeof (payload as { error?: unknown }).error === "string";
}

function isSummaryPayload(payload: DailyVocabSummary | { error?: string }): payload is DailyVocabSummary {
  return (
    typeof (payload as DailyVocabSummary).message === "string" &&
    typeof (payload as DailyVocabSummary).insertedCount === "number"
  );
}
