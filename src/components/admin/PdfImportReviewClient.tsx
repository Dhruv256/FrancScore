"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Loader2, RefreshCw, RotateCcw, X } from "lucide-react";
import type { Json } from "@/lib/supabase/database.types";

type Batch = {
  id: string;
  file_name: string;
  status: string;
  total_pages: number;
  total_chunks: number;
  model_used: string | null;
  error_message: string | null;
};

type Chunk = {
  id: string;
  chunk_index: number;
  page_start: number | null;
  page_end: number | null;
  ai_status: string;
};

type Item = {
  id: string;
  item_type: string;
  title: string | null;
  suggested_destination: string | null;
  confidence: number;
  status: string;
  content_json: Json;
};

const groups = [
  { label: "Grammar Concepts", types: ["grammar_concept"] },
  { label: "Vocabulary / Flashcards", types: ["vocabulary", "phrase", "connector"] },
  { label: "Reading Passages", types: ["reading_passage"] },
  { label: "Exercises", types: ["exercise", "example"] },
  { label: "Writing Prompts", types: ["writing_prompt"] },
  { label: "Speaking Prompts", types: ["speaking_prompt"] },
  { label: "Notes", types: ["study_note", "chapter_heading"] },
  { label: "Rejected / Invalid", types: ["invalid"] },
];

export function PdfImportReviewClient({
  batch,
  chunks,
  items,
  setupError,
}: {
  batch: Batch;
  chunks: Chunk[];
  items: Item[];
  setupError?: string | null;
}) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      completed: chunks.filter((chunk) => chunk.ai_status === "completed").length,
      failed: chunks.filter((chunk) => chunk.ai_status === "failed").length,
      pending: chunks.filter((chunk) => chunk.ai_status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      imported: items.filter((item) => item.status === "imported").length,
    }),
    [chunks, items],
  );

  const runAction = async (body: Record<string, unknown>, label: string) => {
    setBusyAction(label);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/pdf-import/${batch.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as Record<string, unknown> & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "PDF import action failed.");
      }
      setMessage(buildActionMessage(label, payload));
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "PDF import action failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const grouped = groups.map((group) => ({
    ...group,
    items: items.filter((item) => group.types.includes(item.item_type)),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-[#111] p-6 text-[#f7f2e8] shadow-[0_28px_90px_rgba(17,17,17,0.18)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="page-kicker mb-3 text-[#ff9a3d]">PDF review queue</p>
            <h1 className="display-title text-4xl">{batch.file_name}</h1>
            <p className="mt-2 text-sm text-[#d8d0c2]">
              {batch.total_pages} pages · {batch.total_chunks} chunks · status {batch.status}
            </p>
            {batch.error_message ? <p className="mt-2 text-sm text-accent-rose">{batch.error_message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <Stat label="Processed" value={`${stats.completed}/${chunks.length}`} />
            <Stat label="Pending" value={stats.pending} />
            <Stat label="Approved" value={stats.approved} />
            <Stat label="Imported" value={stats.imported} />
          </div>
        </div>
      </div>

      <div className="card-soft rounded-[2rem] p-5">
        {setupError ? (
          <div className="mb-4 rounded-2xl border border-accent-amber/30 bg-accent-amber/10 p-4 text-sm text-accent-amber">
            <p className="font-black text-text-primary">PDF import setup needed</p>
            <p className="mt-1">{setupError}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runAction({ action: "process_next" }, "process_next")}
            disabled={Boolean(busyAction) || Boolean(setupError)}
            className="btn btn-primary"
          >
            {busyAction === "process_next" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Process next chunk
          </button>
          <button
            type="button"
            onClick={() => void runAction({ action: "approve_high_confidence" }, "approve_high_confidence")}
            disabled={Boolean(busyAction) || Boolean(setupError)}
            className="btn btn-secondary"
          >
            <Check className="h-4 w-4" />
            Approve high-confidence
          </button>
          <button
            type="button"
            onClick={() => void runAction({ action: "import_approved" }, "import_approved")}
            disabled={Boolean(busyAction) || Boolean(setupError)}
            className="btn btn-secondary"
          >
            <Download className="h-4 w-4" />
            Import approved
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-status-success">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-accent-rose">{error}</p> : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {chunks.map((chunk) => (
          <div key={chunk.id} className="card flex items-center justify-between rounded-[1.25rem] p-3">
            <div>
              <p className="text-sm font-black">Chunk {chunk.chunk_index + 1}</p>
              <p className="text-xs text-text-muted">Pages {chunk.page_start ?? "?"}-{chunk.page_end ?? "?"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">{chunk.ai_status}</span>
              {chunk.ai_status === "failed" ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void runAction({ action: "process_next", chunkId: chunk.id }, `retry_${chunk.id}`)}
                  disabled={Boolean(busyAction)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {grouped.map((group) => (
        <section key={group.label} className="space-y-3">
          <h2 className="text-xl font-black">{group.label}</h2>
          {group.items.length ? (
            <div className="grid gap-3">
              {group.items.map((item) => (
                <ReviewItem
                  key={item.id}
                  item={item}
                  disabled={Boolean(busyAction)}
                  onApprove={() => void runAction({ action: "set_status", itemId: item.id, status: "approved" }, `approve_${item.id}`)}
                  onReject={() => void runAction({ action: "set_status", itemId: item.id, status: "rejected" }, `reject_${item.id}`)}
                  onSave={(contentJson) =>
                    void runAction(
                      {
                        action: "edit_item",
                        itemId: item.id,
                        title: item.title,
                        confidence: item.confidence,
                        contentJson,
                      },
                      `edit_${item.id}`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-[rgba(17,17,17,0.08)] bg-white/40 p-4 text-sm text-text-muted">
              No items in this group yet.
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function ReviewItem({
  item,
  disabled,
  onApprove,
  onReject,
  onSave,
}: {
  item: Item;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSave: (contentJson: Json) => void;
}) {
  const [text, setText] = useState(JSON.stringify(item.content_json, null, 2));
  const [editError, setEditError] = useState<string | null>(null);

  return (
    <article className="card rounded-[1.5rem] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black">{item.title ?? item.item_type}</h3>
            <span className="badge badge-blue">{item.item_type}</span>
            <span className="badge badge-green">{item.status}</span>
            <span className="badge badge-purple">{Math.round(item.confidence * 100)}%</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">Destination: {item.suggested_destination ?? "review"}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onApprove} disabled={disabled} className="btn btn-secondary btn-sm">
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button type="button" onClick={onReject} disabled={disabled} className="btn btn-ghost btn-sm text-accent-rose">
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="input mt-3 min-h-56 font-mono text-xs"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={disabled}
          className="btn btn-ghost btn-sm"
          onClick={() => {
            try {
              const parsed = JSON.parse(text) as Json;
              setEditError(null);
              onSave(parsed);
            } catch {
              setEditError("JSON is invalid. Fix it before saving.");
            }
          }}
        >
          Save JSON edits
        </button>
        {editError ? <p className="text-xs text-accent-rose">{editError}</p> : null}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <div className="text-xl font-black text-[#ff9a3d]">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#d8d0c2]">{label}</div>
    </div>
  );
}

function buildActionMessage(label: string, payload: Record<string, unknown>) {
  if (label === "process_next") {
    return payload.processed
      ? `Processed chunk ${Number(payload.chunkIndex) + 1}; created ${payload.itemCount ?? 0} items.`
      : "No chunks remain to process.";
  }
  if (label === "approve_high_confidence") {
    return `Approved ${payload.approvedCount ?? 0} high-confidence items.`;
  }
  if (label === "import_approved") {
    return "Approved items imported into FrancScore tables.";
  }
  return "Action saved.";
}
