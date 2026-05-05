"use client";

import { useMemo, useState } from "react";
import { History, PenTool, Send, Target } from "lucide-react";
import { AIReviewPanel } from "@/components/practice/AIReviewPanel";
import type { ExamType, WritingFeedback, WritingPrompt } from "@/lib/types";
import type { WritingSubmissionHistoryItem } from "@/lib/writing/types";
import { formatDate, formatExamType, formatTopicType } from "@/lib/utils";

type SubmitResponse = {
  submissionId: string;
  status: "reviewed" | "ai_failed";
  feedback: WritingFeedback;
  source: "ai" | "fallback";
  warning?: string;
  details?: string;
};

type SubmitErrorResponse = {
  error?: string;
  details?: string;
  submissionId?: string;
  status?: "pending_review";
  reason?: string;
};

interface Props {
  prompts: WritingPrompt[];
  history: WritingSubmissionHistoryItem[];
  defaultExamType: ExamType;
}

export function WritingCoachClient({ prompts, history, defaultExamType }: Props) {
  const [examFilter, setExamFilter] = useState<ExamType>(defaultExamType);
  const filteredPrompts = useMemo(
    () => prompts.filter((prompt) => prompt.examType === examFilter || prompt.examType === "MIXED"),
    [examFilter, prompts],
  );
  const [selectedPromptId, setSelectedPromptId] = useState(
    filteredPrompts[0]?.id ?? prompts[0]?.id ?? "",
  );
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(history[0]?.review ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    history[0]
      ? `Latest submission: ${history[0].promptTitle} on ${formatDate(new Date(history[0].submittedAt))}`
      : null,
  );
  const [submissionHistory, setSubmissionHistory] = useState(history);

  const activePromptId =
    filteredPrompts.find((prompt) => prompt.id === selectedPromptId)?.id ??
    filteredPrompts[0]?.id ??
    prompts.find((prompt) => prompt.id === selectedPromptId)?.id ??
    prompts[0]?.id ??
    "";

  const selectedPrompt =
    filteredPrompts.find((prompt) => prompt.id === activePromptId) ??
    prompts.find((prompt) => prompt.id === activePromptId) ??
    prompts[0];

  const wordCount = useMemo(() => getWordCount(text), [text]);
  const minWords = selectedPrompt?.wordLimit.min ?? 80;
  const maxWords = selectedPrompt?.wordLimit.max ?? 220;
  const isWordCountValid = wordCount >= minWords && wordCount <= maxWords + 120;

  async function handleSubmit() {
    if (!selectedPrompt || isSubmitting) {
      return;
    }

    if (!isWordCountValid) {
      setError(`Please keep your response between ${minWords} and about ${maxWords} words.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setWarning(null);
    setStatusMessage("Saving your submission and running NVIDIA review...");

    try {
      const response = await fetch("/api/ai/writing-evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt_id: selectedPrompt.id,
          submission_text: text,
        }),
      });

      const payload = (await response.json()) as
        | SubmitResponse
        | SubmitErrorResponse;

      if (!response.ok || !("feedback" in payload)) {
        const pendingSubmissionId =
          "submissionId" in payload && typeof payload.submissionId === "string"
            ? payload.submissionId
            : null;

        if (pendingSubmissionId && payload.status === "pending_review") {
          setSubmissionHistory((current) => [
            {
              id: pendingSubmissionId,
              promptId: selectedPrompt.id,
              promptTitle: selectedPrompt.title,
              examType: selectedPrompt.examType as ExamType,
              status: "pending_review",
              wordCount,
              submittedAt: new Date().toISOString(),
              estimatedCefr: null,
              score20: null,
              review: null,
            },
            ...current.filter((item) => item.id !== pendingSubmissionId),
          ]);
          setStatusMessage(
            "Your submission was saved, but it needs manual review before AI feedback can be shown.",
          );
        }
        throw new Error(
          ("error" in payload && payload.error) || "Unable to submit writing review.",
        );
      }

      setFeedback(payload.feedback);
      setWarning(payload.warning ?? null);
      setStatusMessage(
        payload.status === "reviewed"
          ? "Review completed and saved to your writing history."
          : "Submission saved. NVIDIA review failed, so FrancScore showed fallback feedback.",
      );
      setSubmissionHistory((current) => [
        {
          id: payload.submissionId,
          promptId: selectedPrompt.id,
          promptTitle: selectedPrompt.title,
          examType: selectedPrompt.examType as ExamType,
          status: payload.status,
          wordCount,
          submittedAt: new Date().toISOString(),
          estimatedCefr: payload.feedback.estimatedLevel,
          score20: payload.feedback.score20 ?? null,
          review: payload.feedback,
        },
        ...current.filter((item) => item.id !== payload.submissionId),
      ]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your writing right now.",
      );
      setStatusMessage("Your submission could not be evaluated yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleHistorySelect(item: WritingSubmissionHistoryItem) {
    setFeedback(item.review);
    setWarning(
      item.status === "ai_failed"
        ? "This submission was saved, but the AI review failed at the time. Showing fallback feedback."
        : null,
    );
    setStatusMessage(`${item.promptTitle} submitted on ${formatDate(new Date(item.submittedAt))}`);
  }

  if (!selectedPrompt) {
    return (
      <div className="card p-8 text-center">
        <PenTool className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-30" />
        <h3 className="text-sm font-semibold text-text-muted mb-2">No writing prompts yet</h3>
        <p className="text-xs text-text-muted">
          Published writing prompts will appear here once they are available in Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel overflow-hidden rounded-[2rem] p-5 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-skill-writing via-brand-green to-transparent" />
        <div className="page-kicker mb-4">
          <Send className="w-4 h-4" />
          AI composition studio
        </div>
        <h1 className="display-title text-5xl sm:text-6xl flex items-center gap-2 mb-2">
          <PenTool className="w-6 h-6 text-skill-writing" />
          Writing Coach
        </h1>
        <p className="text-sm text-text-secondary">
          Write and get real Supabase + NVIDIA-powered CEFR feedback
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["TEF_CANADA", "TCF_CANADA", "MIXED"] as const).map((exam) => (
          <button
            key={exam}
            onClick={() => setExamFilter(exam)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              examFilter === exam
                ? "bg-brand-green text-bg-primary"
                : "bg-bg-input text-text-secondary border border-border-default"
            }`}
          >
            {formatExamType(exam)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_380px] gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
            <div className="card p-3">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Prompt Bank
              </h2>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => setSelectedPromptId(prompt.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      prompt.id === selectedPrompt.id
                        ? "border-brand-green bg-brand-green/10"
                        : "border-border-default bg-bg-input hover:border-brand-green/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="badge badge-green">{prompt.type}</span>
                      <span className="badge badge-blue">{prompt.cefrLevel}</span>
                    </div>
                    <div className="text-sm font-medium mb-1">{prompt.title}</div>
                    <div className="text-xs text-text-muted">
                      {prompt.wordLimit.min}-{prompt.wordLimit.max} words
                    </div>
                  </button>
                ))}
                {!filteredPrompts.length ? (
                  <div className="p-4 rounded-xl border border-dashed border-border-default text-xs text-text-muted">
                    No prompts match this exam filter yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <span className="badge badge-green mb-2">{selectedPrompt.type}</span>
                    <h2 className="text-base font-semibold">{selectedPrompt.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="badge badge-blue">{selectedPrompt.cefrLevel}</span>
                    <span className="badge badge-purple">
                      {formatExamType(selectedPrompt.examType)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {selectedPrompt.prompt}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-text-muted flex-wrap">
                  <span>
                    Target: {selectedPrompt.wordLimit.min}-{selectedPrompt.wordLimit.max} words
                  </span>
                  <span>Topic: {formatTopicType(selectedPrompt.topicType)}</span>
                </div>
              </div>

              <div className="card p-0 overflow-hidden">
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Commencez à écrire votre réponse ici..."
                  className="w-full h-72 p-5 bg-transparent border-none outline-none resize-none text-sm text-text-primary placeholder:text-text-muted leading-relaxed"
                  disabled={isSubmitting}
                />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-t border-border-default bg-bg-input">
                  <div className="space-y-1">
                    <span
                      className={`text-xs font-medium ${
                        wordCount >= minWords && wordCount <= maxWords
                          ? "text-status-success"
                          : wordCount > maxWords + 120 || wordCount < minWords
                          ? "text-accent-rose"
                          : "text-accent-amber"
                      }`}
                    >
                      {wordCount} words
                    </span>
                    <div className="text-[11px] text-text-muted">
                      Target range: {minWords}-{maxWords} words
                    </div>
                  </div>

                  <button
                    onClick={() => void handleSubmit()}
                    disabled={isSubmitting || !text.trim() || !isWordCountValid}
                    className="btn btn-primary btn-sm disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? "Submitting..." : "Submit for Review"}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="card p-4 border border-accent-rose/30 bg-accent-rose/10">
                  <p className="text-xs text-accent-rose">{error}</p>
                </div>
              ) : null}

              <div className="card p-5">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Evaluation Criteria
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedPrompt.criteria.map((criterion) => (
                    <div
                      key={criterion}
                      className="flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <Target className="w-3 h-3 text-brand-green shrink-0" />
                      {criterion}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-brand-purple" />
              <h3 className="text-sm font-semibold">Past Writing Submissions</h3>
            </div>
            {submissionHistory.length ? (
              <div className="space-y-2">
                {submissionHistory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistorySelect(item)}
                    className="w-full text-left p-3 rounded-xl border border-border-default bg-bg-input hover:border-brand-green/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.promptTitle}</div>
                        <div className="text-xs text-text-muted">
                          {formatDate(new Date(item.submittedAt))} · {item.wordCount} words
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold">
                          {item.score20 !== null ? `${item.score20}/20` : "Pending"}
                        </div>
                        <div className="text-[11px] text-text-muted uppercase">
                          {item.status.replaceAll("_", " ")}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border-default text-xs text-text-muted">
                No writing history yet. Your first reviewed submission will appear here.
              </div>
            )}
          </div>
        </div>

        <AIReviewPanel
          feedback={feedback}
          warning={warning}
          statusMessage={statusMessage}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
