"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, TriangleAlert, Zap } from "lucide-react";

type ProcessingJob = {
  id: string;
  status: string;
  progress: number;
  current_step: string | null;
  result_json: unknown;
  error_message: string | null;
};

type GenerationPreviewItem = {
  french_word: string;
  english_meaning?: string;
  topic?: string;
  cefr_level?: string;
  tags?: string[];
  status?: string;
};

export type GenerationBatchHistory = {
  id: string;
  created_at: string;
  requested_count: number;
  generated_count: number;
  inserted_count: number;
  duplicate_count: number;
  failed_count: number;
  model: string | null;
  status: string;
  error_message: string | null;
  preview: GenerationPreviewItem[];
};

type GenerateDailyVocabButtonProps = {
  enabled: boolean;
  disabledReason: string | null;
  requestedCount: number;
  latestBatches: GenerationBatchHistory[];
};

type GenerateRoutePayload = {
  ok?: boolean;
  jobId?: string;
  status?: string;
  progress?: number;
  code?: string;
  message?: string;
  error?: string;
  requested_count?: number;
  generated_count?: number;
  inserted_count?: number;
  duplicate_count?: number;
  failed_count?: number;
  preview?: GenerationPreviewItem[];
};

type JobResultSummary = {
  message?: string;
  requestedCount?: number;
  generatedCount?: number;
  insertedCount?: number;
  skippedDuplicateCount?: number;
  failedCount?: number;
  insertedPreview?: GenerationPreviewItem[];
};

export function GenerateDailyVocabButton({
  enabled,
  disabledReason,
  requestedCount,
  latestBatches,
}: GenerateDailyVocabButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GenerationPreviewItem[]>([]);

  const latestSuccessfulPreview = useMemo(
    () => latestBatches.find((batch) => batch.status === "completed")?.preview ?? [],
    [latestBatches],
  );
  const isActiveJob = job?.status === "queued" || job?.status === "processing";
  const progress = job?.progress ?? 0;
  const completedSummary = getJobSummary(job);

  function handleTerminalJob(nextJob: ProcessingJob) {
    if (nextJob.status === "completed") {
      const summary = getJobSummary(nextJob);
      const insertedCount = summary?.insertedCount ?? 0;
      setPreview(summary?.insertedPreview ?? []);
      setMessage(
        insertedCount > 0
          ? `${insertedCount} words saved to Flashcards.`
          : summary?.message ?? "Daily vocabulary generation completed.",
      );
    } else if (nextJob.status === "failed") {
      setError(nextJob.error_message ?? "Daily vocabulary generation failed.");
    }
  }

  useEffect(() => {
    if (!isActiveJob || !job) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/jobs/${job.id}`, { credentials: "include" });
        const payload = (await response.json()) as { job?: ProcessingJob; error?: string };
        if (!response.ok || !payload.job) {
          throw new Error(payload.error ?? "Unable to load job progress.");
        }
        if (!cancelled) {
          setJob(payload.job);
          handleTerminalJob(payload.job);
        }
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
  }, [isActiveJob, job]);

  const generate = async () => {
    setIsGenerating(true);
    setMessage(null);
    setError(null);
    setPreview([]);

    try {
      const response = await fetch("/api/admin/vocabulary/generate-daily", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as GenerateRoutePayload;

      if (!response.ok) {
        throw new Error(payload.message ?? payload.error ?? "Unable to queue vocabulary generation.");
      }

      if (!payload.jobId) {
        const insertedCount = payload.inserted_count ?? 0;
        setPreview(payload.preview ?? []);
        setMessage(payload.message ?? `${insertedCount} words saved to Flashcards.`);
        setJob({
          id: "direct-generation",
          status: "completed",
          progress: 100,
          current_step: "Completed",
          result_json: {
            requestedCount: payload.requested_count,
            generatedCount: payload.generated_count,
            insertedCount,
            skippedDuplicateCount: payload.duplicate_count,
            failedCount: payload.failed_count,
            insertedPreview: payload.preview ?? [],
          },
          error_message: null,
        });
        return;
      }

      const queuedJob: ProcessingJob = {
        id: payload.jobId,
        status: payload.status ?? "queued",
        progress: payload.progress ?? 0,
        current_step: "Queued",
        result_json: null,
        error_message: null,
      };
      setJob(queuedJob);

      await processJob(payload.jobId);
    } catch (generateError) {
      setJob(null);
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
    const response = await fetch(`/api/admin/jobs/${jobId}/process-next`, {
      method: "POST",
      credentials: "include",
    });
    const payload = (await response.json()) as { job?: ProcessingJob; error?: string };
    if (!response.ok || !payload.job) {
      throw new Error(payload.error ?? "Unable to process generation job.");
    }

    setJob(payload.job);
    handleTerminalJob(payload.job);
  };

  const statusLabel = !enabled
    ? "Disabled"
    : isActiveJob || isGenerating
      ? "Generating"
      : job?.status === "completed"
        ? "Completed"
        : error
          ? "Failed"
          : "Ready";

  return (
    <div className="card-soft rounded-[2rem] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="page-kicker mb-2">
            <Sparkles className="h-4 w-4" />
            Daily AI vocabulary
          </p>
          <h2 className="text-xl font-black text-text-primary">Generate Today&apos;s 50 Words</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {enabled
              ? `Ready to generate ${requestedCount} TEF/TCF flashcards.`
              : "Daily AI vocabulary generation is not ready on this server."}
          </p>
          <StatusPill label={statusLabel} enabled={enabled} />
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={!enabled || isGenerating || isActiveJob}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating || isActiveJob ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {isGenerating || isActiveJob ? "Generating..." : "Generate Today's 50 AI Words"}
        </button>
      </div>

      {!enabled && disabledReason ? (
        <SetupNotice title={disabledReason.includes("KEY") ? "Missing API key" : "Disabled"} message={disabledReason} />
      ) : null}

      {job ? (
        <div className="mt-4 rounded-2xl bg-white/50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-text-muted">
            <span>{job.current_step ?? job.status}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar h-3">
            <div
              className="progress-fill h-3 bg-brand-green"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          {completedSummary ? (
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
              <Metric label="Generated" value={completedSummary.generatedCount ?? 0} />
              <Metric label="Inserted" value={completedSummary.insertedCount ?? 0} />
              <Metric label="Duplicates" value={completedSummary.skippedDuplicateCount ?? 0} />
              <Metric label="Failed" value={completedSummary.failedCount ?? 0} />
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-2xl bg-status-success/10 p-4 text-sm text-status-success">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
          <Link href="/vocabulary/flashcards" className="mt-3 inline-flex font-black underline">
            Open Flashcards
          </Link>
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-2xl bg-accent-rose/10 p-4 text-sm text-accent-rose">
          <div className="flex items-center gap-2 font-bold">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        </div>
      ) : null}

      <PreviewList items={preview.length ? preview : latestSuccessfulPreview} />
      <BatchHistory batches={latestBatches} />
    </div>
  );
}

function getJobSummary(job: ProcessingJob | null): JobResultSummary | null {
  if (!job || job.status !== "completed" || !job.result_json || typeof job.result_json !== "object") {
    return null;
  }
  return job.result_json as JobResultSummary;
}

function StatusPill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${enabled ? "bg-brand-green/15 text-brand-green" : "bg-accent-rose/10 text-accent-rose"}`}>
      {label}
    </span>
  );
}

function SetupNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-accent-rose/20 bg-accent-rose/10 p-4 text-sm text-accent-rose">
      <p className="font-black">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-black text-text-primary">{value}</p>
    </div>
  );
}

function PreviewList({ items }: { items: GenerationPreviewItem[] }) {
  if (!items.length) return null;

  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">Inserted-word preview</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.slice(0, 8).map((item, index) => (
          <div key={`${item.french_word}-${index}`} className="rounded-2xl bg-white/60 p-3">
            <p className="font-black text-text-primary">{item.french_word}</p>
            {item.english_meaning ? <p className="text-sm text-text-secondary">{item.english_meaning}</p> : null}
            {item.status ? <p className="text-xs font-bold text-text-muted">{item.status}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function BatchHistory({ batches }: { batches: GenerationBatchHistory[] }) {
  if (!batches.length) {
    return (
      <div className="mt-5 rounded-2xl bg-white/40 p-4 text-sm text-text-secondary">
        No daily generation batch history yet.
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border-soft bg-white/50">
      <div className="grid grid-cols-7 gap-2 border-b border-border-soft px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-text-muted">
        <span>Date</span>
        <span>Status</span>
        <span>Requested</span>
        <span>Generated</span>
        <span>Inserted</span>
        <span>Duplicates</span>
        <span>Model</span>
      </div>
      {batches.map((batch) => (
        <div key={batch.id} className="grid grid-cols-7 gap-2 border-b border-border-soft px-4 py-3 text-sm last:border-0">
          <span>{new Date(batch.created_at).toLocaleDateString()}</span>
          <span className="font-bold">{batch.status}</span>
          <span>{batch.requested_count}</span>
          <span>{batch.generated_count}</span>
          <span>{batch.inserted_count}</span>
          <span>{batch.duplicate_count}</span>
          <span className="truncate" title={batch.model ?? ""}>{batch.model ?? "n/a"}</span>
          {batch.error_message ? (
            <span className="col-span-7 rounded-xl bg-accent-rose/10 p-2 text-accent-rose">{batch.error_message}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
