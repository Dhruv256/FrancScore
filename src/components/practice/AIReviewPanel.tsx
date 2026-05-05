"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  PenTool,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import type { WritingFeedback } from "@/lib/types";
import { formatCEFRLevel } from "@/lib/utils";

interface Props {
  feedback: WritingFeedback | null;
  statusMessage?: string | null;
  warning?: string | null;
  isLoading?: boolean;
}

export function AIReviewPanel({ feedback, statusMessage, warning, isLoading }: Props) {
  const [showB2Rewrite, setShowB2Rewrite] = useState(false);

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
        <PenTool className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-30" />
        <h3 className="text-sm font-semibold text-text-muted mb-2">AI Feedback</h3>
        <p className="text-xs text-text-muted">
          Submit a writing response to receive CEFR scoring, corrections, a B2 rewrite,
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
            {feedback.score20 ?? Math.round(feedback.score / 5)}/20
          </div>
          <div className="text-xs text-text-muted mt-1">Estimated exam score</div>
        </div>
        <div className="text-center">
          <span className="badge badge-green text-sm px-4 py-1">
            Estimated: {formatCEFRLevel(feedback.estimatedLevel)}
          </span>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Skill Breakdown</h3>
        {[
          { label: "Task Completion", value: feedback.taskCompletion ?? 0, color: "#8b5cf6" },
          { label: "Grammar", value: feedback.grammarScore ?? 0, color: "#ef4444" },
          { label: "Vocabulary", value: feedback.vocabularyScore ?? 0, color: "#10b981" },
          { label: "Structure", value: feedback.structureScore ?? 0, color: "#3b82f6" },
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
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent-amber" />
          Corrections ({feedback.grammarIssues.length + feedback.vocabularyUpgrades.length})
        </h3>
        <div className="space-y-3">
          {feedback.grammarIssues.map((issue, index) => (
            <div
              key={`grammar-${index}`}
              className="p-3 rounded-lg bg-bg-input border border-border-default"
            >
              <div className="text-xs text-accent-rose line-through mb-1">{issue.text}</div>
              <div className="text-xs text-status-success mb-1">-&gt; {issue.correction}</div>
              <div className="text-xs text-text-muted">{issue.explanation}</div>
            </div>
          ))}
          {feedback.vocabularyUpgrades.map((upgrade, index) => (
            <div
              key={`vocabulary-${index}`}
              className="p-3 rounded-lg bg-bg-input border border-border-default"
            >
              <div className="text-xs text-text-muted">
                <span className="text-accent-amber">{upgrade.original}</span> -&gt;{" "}
                <span className="text-brand-green">{upgrade.suggestion}</span>
              </div>
              <div className="text-xs text-text-muted mt-1">{upgrade.reason}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-green" />
          Strengths
        </h3>
        <ul className="space-y-2">
          {feedback.strengths.map((strength, index) => (
            <li key={index} className="text-xs text-text-secondary flex items-start gap-2">
              <span className="text-brand-green mt-0.5">•</span>
              {strength}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-accent-rose" />
          Improvement Focus
        </h3>
        <ul className="space-y-2">
          {feedback.weaknesses.map((weakness, index) => (
            <li key={index} className="text-xs text-text-secondary flex items-start gap-2">
              <span className="text-accent-rose mt-0.5">•</span>
              {weakness}
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-muted mt-3 leading-relaxed">
          {feedback.structureFeedback}
        </p>
      </div>

      <div className="card p-5">
        <button
          onClick={() => setShowB2Rewrite((value) => !value)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-purple" />
            B2 Rewrite
          </h3>
          {showB2Rewrite ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </button>
        {showB2Rewrite ? (
          <p className="text-xs text-text-secondary leading-relaxed mt-3 p-3 rounded-lg bg-brand-purple/5 border border-brand-purple/10 whitespace-pre-wrap">
            {feedback.b2Rewrite}
          </p>
        ) : null}
      </div>

      <div className="card p-5 card-glow-purple">
        <h3 className="text-sm font-semibold mb-2">Next Drill</h3>
        <p className="text-xs text-text-secondary mb-3">{feedback.nextDrill}</p>
        <button className="btn btn-primary btn-sm w-full">
          Start Drill
          <Zap className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
