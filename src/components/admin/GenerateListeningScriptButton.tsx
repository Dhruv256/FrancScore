"use client";

import { useState } from "react";
import { Headphones, Sparkles } from "lucide-react";

export function GenerateListeningScriptButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setIsGenerating(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/listening/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate listening script.");
      }
      setMessage(payload.message ?? "Listening script generated.");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unable to generate listening script.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="card-soft rounded-[2rem] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="page-kicker mb-2">
            <Headphones className="h-4 w-4" />
            Varied listening scripts
          </p>
          <h2 className="text-xl font-black">Generate a unique listening script</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Creates an unpublished passage/question pair with transcript only. Upload or generate unique audio before publishing.
          </p>
        </div>
        <button type="button" onClick={() => void generate()} disabled={isGenerating} className="btn btn-primary">
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Script"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-status-success">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-accent-rose">{error}</p> : null}
      <p className="mt-3 text-xs text-text-muted">
        TTS integration is intentionally not faked here: no repeated fallback audio will be attached.
      </p>
    </div>
  );
}
