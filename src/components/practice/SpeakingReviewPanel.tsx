"use client";

import { Mic, Sparkles, Zap } from "lucide-react";
import type { SpeakingFeedback } from "@/lib/types";
import { formatCEFRLevel } from "@/lib/utils";

interface Props {
  feedback: SpeakingFeedback | null;
  statusMessage?: string | null;
  warning?: string | null;
  isLoading?: boolean;
}

export function SpeakingReviewPanel({
  feedback,
  statusMessage,
  warning,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="card p-5 animate-pulse">
          <div className="h-10 w-20 rounded bg-white/10 mx-auto mb-3" />
          <div className="h-5 w-32 rounded bg-white/10 mx-auto" />
        </div>
        <div className="card p-5 animate-pulse">
          <div className="h-4 w-32 rounded bg-white/10 mb-4" />
          <div className="space-y-3">
            <div className="h-16 rounded bg-white/5" />
            <div className="h-16 rounded bg-white/5" />
            <div className="h-16 rounded bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="card p-8 text-center">
        <Mic className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
        <h3 className="text-sm font-semibold text-text-muted mb-2">AI Feedback</h3>
        <p className="text-xs text-text-muted">
          Submit a transcript to receive CEFR scoring, skill breakdown, better phrases,
          and your next drill.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {warning ? (
        <div className="card p-4 border border-accent-amber/30 bg-accent-amber/10">
          <p className="text-xs text-accent-amber leading-relaxed">{warning}</p>
        </div>
      ) : null}

      {statusMessage ? (
        <div className="card p-4 border border-border-default bg-bg-input">
          <p className="text-xs text-text-secondary">{statusMessage}</p>
        </div>
      ) : null}

      <div className="card p-5 card-glow-green">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold gradient-text-green">
            {feedback.score20 ?? Math.round(feedback.estimatedScore / 5)}/20
          </div>
          <div className="text-xs text-text-muted mt-1">Estimated speaking score</div>
        </div>
        <div className="text-center">
          <span className="badge badge-green text-sm px-4 py-1">
            Estimated: {formatCEFRLevel(feedback.estimatedCefrLevel)}
          </span>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Skill Breakdown</h3>
        {[
          { label: "Fluency", value: feedback.fluency, color: "#f59e0b" },
          { label: "Grammar", value: feedback.grammar, color: "#ef4444" },
          { label: "Vocabulary", value: feedback.vocabulary, color: "#10b981" },
          { label: "Structure", value: feedback.structure, color: "#3b82f6" },
          { label: "Task Relevance", value: feedback.taskRelevance, color: "#8b5cf6" },
        ].map((metric) => (
          <div key={metric.label} className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary">{metric.label}</span>
              <span className="font-medium">{metric.value}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${metric.value}%`, background: metric.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-2">Transcript</h3>
        <p className="text-xs text-text-secondary leading-relaxed p-3 rounded-lg bg-bg-input whitespace-pre-wrap">
          {feedback.transcript}
        </p>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Better Phrases</h3>
        <div className="space-y-2">
          {(feedback.betterPhrases ?? []).map((phrase, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-bg-input border border-border-default text-xs text-text-secondary"
            >
              {phrase}
            </div>
          ))}
          {!(feedback.betterPhrases ?? []).length ? (
            <div className="text-xs text-text-muted">No phrase upgrades yet for this review.</div>
          ) : null}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3">Corrections</h3>
        <div className="space-y-2">
          {feedback.corrections.map((correction, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-bg-input border border-border-default"
            >
              <div className="text-xs text-accent-rose line-through">
                {correction.original}
              </div>
              <div className="text-xs text-status-success mt-1">
                -&gt; {correction.corrected}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-purple" />
          Feedback Summary
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-3">
          {feedback.feedbackSummary ?? feedback.strengths[0] ?? "Keep refining your response structure."}
        </p>
        <ul className="space-y-2">
          {feedback.suggestions.map((suggestion, index) => (
            <li key={index} className="text-xs text-text-secondary flex items-start gap-2">
              <span className="text-brand-green mt-0.5">•</span>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5 card-glow-purple">
        <h3 className="text-sm font-semibold mb-2">Next Drill</h3>
        <p className="text-xs text-text-secondary mb-3">
          {feedback.suggestions.at(-1) ?? "Re-record with clearer structure and fewer fillers."}
        </p>
        <button className="btn btn-primary btn-sm w-full">
          Start Drill
          <Zap className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
