"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Zap } from "lucide-react";

type ProcessingJob = {
  id: string;
  status: string;
  progress: number;
  current_step: string | null;
  result_json: unknown;
  error_message: string | null;
};

export function GenerateDailyVocabButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/jobs/${job.id}`, { credentials: "include" });
        const payload = (await response.json()) as { job?: ProcessingJob; error?: string };
        if (!response.ok || !payload.job) {
          throw new Error(payload.error ?? "Unable to load job progress.");
        }
        if (!cancelled) setJob(payload.job);
      } catch (progressError) {
        if (!cancelled) {
          setError(progressError instanceof Error ? progressError.message : "Unable to load job progress.");
        }
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [job]);

  const generate = async () => {
    setIsGenerating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/vocabulary/generate-daily", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as { jobId?: string; error?: string };

      if (!response.ok || !payload.jobId) {
        throw new Error(payload.error ?? "Unable to queue vocabulary generation.");
      }

      setJob({
        id: payload.jobId,
        status: "queued",
        progress: 0,
        current_step: "Queued",
        result_json: null,
        error_message: null,
      });

      await processJob(payload.jobId);
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

  const processJob = async (jobId: string) => {
    const response = await fetch(`/api/jobs/${jobId}/process-next`, {
      method: "POST",
      credentials: "include",
    });
    const payload = (await response.json()) as { job?: ProcessingJob; error?: string };
    if (!response.ok || !payload.job) {
      throw new Error(payload.error ?? "Unable to process generation job.");
    }

    setJob(payload.job);
    if (payload.job.status === "completed") {
      const summary = payload.job.result_json as { message?: string; insertedCount?: number } | null;
      setMessage(summary?.message ?? "Daily vocabulary generation completed.");
    } else if (payload.job.status === "failed") {
      setError(payload.job.error_message ?? "Daily vocabulary generation failed.");
    }
  };

  const progress = job?.progress ?? 0;

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
            Queues a job, shows progress, validates and bulk-inserts published TEF/TCF flashcards.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={isGenerating || (job?.status === "processing")}
          className="btn btn-primary"
        >
          {isGenerating || job?.status === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {isGenerating || job?.status === "processing" ? "Generating..." : "Generate Today's 50 AI Words"}
        </button>
      </div>

      {job ? (
        <div className="mt-4 rounded-2xl bg-white/50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-text-muted">
            <span>{job.current_step ?? job.status}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar h-3">
            <div className="progress-fill progress-fill-green h-3" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-2xl bg-status-success/10 p-3 text-sm text-status-success">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-accent-rose/10 p-3 text-sm text-accent-rose">{error}</p> : null}
    </div>
  );
}
