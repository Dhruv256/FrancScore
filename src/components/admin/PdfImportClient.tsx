"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FileText, Loader2, UploadCloud } from "lucide-react";

type PdfBatch = {
  id: string;
  file_name: string;
  total_pages: number;
  total_chunks: number;
  status: string;
  model_used: string | null;
  error_message: string | null;
  created_at: string;
};

export function PdfImportClient({
  batches,
  enabled,
  setupWarnings,
}: {
  batches: PdfBatch[];
  enabled: boolean;
  setupWarnings: string[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (!file || isUploading || !enabled) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/pdf-import/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { batchId?: string; error?: string };
      if (!response.ok || !payload.batchId) {
        throw new Error(payload.error ?? "PDF upload failed.");
      }
      router.push(`/admin/pdf-import/${payload.batchId}`);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "PDF upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-[rgba(17,17,17,0.08)] bg-[#f7f2e8] p-6 shadow-[0_24px_80px_rgba(17,17,17,0.08)]">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="page-kicker mb-3">
              <FileText className="h-4 w-4" />
              AI PDF ingestion
            </p>
            <h1 className="display-title text-4xl text-text-primary sm:text-5xl">
              Turn French books into reviewable learning material.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
              Upload a PDF, extract server-side text, chunk it safely, process one chunk at a time with Kimi/NVIDIA, then approve items before they enter FrancScore.
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-[#111] p-5 text-[#f7f2e8]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff9a3d]">Server-only</p>
            <p className="mt-2 text-sm text-[#d8d0c2]">
              PDFs go to private Supabase Storage bucket <code>pdf-imports</code>. NVIDIA keys never touch the browser.
            </p>
          </div>
        </div>
      </div>

      {setupWarnings.length ? (
        <div className="rounded-[1.5rem] border border-accent-amber/30 bg-accent-amber/10 p-4 text-sm text-accent-amber">
          <p className="font-black text-text-primary">System setup warnings</p>
          <ul className="mt-2 space-y-1">
            {setupWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card-soft rounded-[2rem] p-5">
        <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[rgba(17,17,17,0.16)] bg-white/45 p-6 text-center">
          <UploadCloud className="mb-3 h-10 w-10 text-brand-green" />
          <span className="text-lg font-black text-text-primary">
            {file ? file.name : "Choose a French exam-prep PDF"}
          </span>
          <span className="mt-1 text-xs text-text-muted">Server extracts and chunks text after upload.</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => void upload()}
            disabled={!file || isUploading || !enabled}
            className="btn btn-primary"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isUploading ? "Uploading and extracting..." : "Upload PDF"}
          </button>
          {error ? <p className="text-sm text-accent-rose">{error}</p> : null}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-black">Recent imports</h2>
        {batches.length ? (
          <div className="grid gap-3">
            {batches.map((batch) => (
              <Link
                key={batch.id}
                href={`/admin/pdf-import/${batch.id}`}
                className="card flex flex-col gap-3 rounded-[1.5rem] p-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{batch.file_name}</h3>
                    <span className="badge badge-blue">{batch.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {batch.total_pages} pages · {batch.total_chunks} chunks · {batch.model_used ?? "No model yet"}
                  </p>
                  {batch.error_message ? <p className="mt-1 text-xs text-accent-rose">{batch.error_message}</p> : null}
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card-soft rounded-[1.5rem] p-6 text-sm text-text-secondary">
            No PDFs imported yet.
          </div>
        )}
      </div>
    </div>
  );
}
