"use client";

import { useMemo, useState } from "react";
import { Clock, History, Mic, Send, Target, Upload } from "lucide-react";
import { SpeakingReviewPanel } from "@/components/practice/SpeakingReviewPanel";
import type { ExamType, SpeakingFeedback, SpeakingPrompt } from "@/lib/types";
import type { SpeakingSubmissionHistoryItem } from "@/lib/speaking/types";
import { formatDate, formatExamType, formatTopicType } from "@/lib/utils";

type SubmitResponse = {
  submissionId: string;
  status: "reviewed" | "ai_failed";
  feedback: SpeakingFeedback;
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
  prompts: SpeakingPrompt[];
  history: SpeakingSubmissionHistoryItem[];
  defaultExamType: ExamType;
}

export function SpeakingCoachClient({ prompts, history, defaultExamType }: Props) {
  const [examFilter, setExamFilter] = useState<ExamType>(defaultExamType);
  const filteredPrompts = useMemo(
    () => prompts.filter((prompt) => prompt.examType === examFilter || prompt.examType === "MIXED"),
    [examFilter, prompts],
  );
  const [selectedPromptId, setSelectedPromptId] = useState(
    filteredPrompts[0]?.id ?? prompts[0]?.id ?? "",
  );
  const [transcript, setTranscript] = useState("");
  const [audioPlaceholderName, setAudioPlaceholderName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(history[0]?.review ?? null);
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

  const transcriptWordCount = useMemo(() => getWordCount(transcript), [transcript]);

  async function handleSubmit() {
    if (!selectedPrompt || isSubmitting) {
      return;
    }

    if (transcriptWordCount < 15) {
      setError("Please provide a fuller transcript before submitting.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setWarning(null);
    setStatusMessage("Saving your speaking submission and running NVIDIA review...");

    try {
      const response = await fetch("/api/ai/speaking-evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt_id: selectedPrompt.id,
          transcript,
          audio_path: audioPlaceholderName
            ? `placeholder://uploaded/${audioPlaceholderName}`
            : undefined,
        }),
      });

      const payload = (await response.json()) as SubmitResponse | SubmitErrorResponse;
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
              submittedAt: new Date().toISOString(),
              estimatedCefr: null,
              score20: null,
              transcript,
              audioPath: audioPlaceholderName
                ? `placeholder://uploaded/${audioPlaceholderName}`
                : "placeholder://manual-transcript",
              review: null,
            },
            ...current.filter((item) => item.id !== pendingSubmissionId),
          ]);
          setStatusMessage(
            "Your submission was saved, but it needs manual review before AI feedback can be shown.",
          );
        }

        throw new Error(
          ("error" in payload && payload.error) || "Unable to submit speaking review.",
        );
      }

      setFeedback(payload.feedback);
      setWarning(payload.warning ?? null);
      setStatusMessage(
        payload.status === "reviewed"
          ? "Review completed and saved to your speaking history."
          : "Submission saved. NVIDIA review failed, so FrancScore showed fallback feedback.",
      );
      setSubmissionHistory((current) => [
        {
          id: payload.submissionId,
          promptId: selectedPrompt.id,
          promptTitle: selectedPrompt.title,
          examType: selectedPrompt.examType as ExamType,
          status: payload.status,
          submittedAt: new Date().toISOString(),
          estimatedCefr: payload.feedback.estimatedCefrLevel,
          score20: payload.feedback.score20 ?? null,
          transcript,
          audioPath: audioPlaceholderName
            ? `placeholder://uploaded/${audioPlaceholderName}`
            : "placeholder://manual-transcript",
          review: payload.feedback,
        },
        ...current.filter((item) => item.id !== payload.submissionId),
      ]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your speaking review right now.",
      );
      setStatusMessage("Your submission could not be evaluated yet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleHistorySelect(item: SpeakingSubmissionHistoryItem) {
    setFeedback(item.review);
    setWarning(
      item.status === "ai_failed"
        ? "This submission was saved, but the AI review failed at the time. Showing fallback feedback."
        : null,
    );
    setStatusMessage(`${item.promptTitle} submitted on ${formatDate(new Date(item.submittedAt))}`);
    setTranscript(item.transcript ?? "");
    setAudioPlaceholderName(item.audioPath?.replace("placeholder://uploaded/", "") ?? null);
  }

  if (!selectedPrompt) {
    return (
      <div className="card p-8 text-center">
        <Mic className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
        <h3 className="text-sm font-semibold text-text-muted mb-2">No speaking prompts yet</h3>
        <p className="text-xs text-text-muted">
          Published speaking prompts will appear here once they are available in Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel overflow-hidden rounded-[2rem] p-5 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-skill-speaking via-brand-purple to-transparent" />
        <div className="page-kicker mb-4">
          <Mic className="w-4 h-4" />
          Fluency studio
        </div>
        <h1 className="display-title text-5xl sm:text-6xl flex items-center gap-2 mb-2">
          <Mic className="w-6 h-6 text-skill-speaking" />
          Speaking Coach
        </h1>
        <p className="text-sm text-text-secondary">
          Transcript-first speaking evaluation with Supabase + NVIDIA review
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
                      <span className="badge badge-amber">{prompt.type}</span>
                      <span className="badge badge-blue">{prompt.cefrLevel}</span>
                    </div>
                    <div className="text-sm font-medium mb-1">{prompt.title}</div>
                    <div className="text-xs text-text-muted">
                      {prompt.durationSeconds}s response
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
                    <span className="badge badge-amber mb-2">{selectedPrompt.type}</span>
                    <h2 className="text-base font-semibold">{selectedPrompt.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="badge badge-blue">{selectedPrompt.cefrLevel}</span>
                    <span className="badge badge-purple">
                      {formatExamType(selectedPrompt.examType)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {selectedPrompt.prompt}
                </p>
                <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Duration: {selectedPrompt.durationSeconds}s
                  </span>
                  <span>Prep: {selectedPrompt.preparationSeconds}s</span>
                  <span>Topic: {formatTopicType(selectedPrompt.topicType)}</span>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold">Transcript Input</h3>
                  <span className="text-xs text-text-muted">
                    {transcriptWordCount} words
                  </span>
                </div>
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="Type your French transcript here for V1 speaking evaluation..."
                  className="w-full h-64 p-4 bg-bg-input rounded-xl border border-border-default outline-none resize-none text-sm text-text-primary placeholder:text-text-muted leading-relaxed"
                  disabled={isSubmitting}
                />
                <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                  <div className="text-[11px] text-text-muted">
                    Minimum recommended transcript length: 15 words
                  </div>
                  <button
                    onClick={() => void handleSubmit()}
                    disabled={isSubmitting || transcriptWordCount < 15}
                    className="btn btn-primary btn-sm disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? "Submitting..." : "Submit for Review"}
                  </button>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-4 h-4 text-brand-purple" />
                  <h3 className="text-sm font-semibold">Audio Upload Placeholder</h3>
                </div>
                <label className="block">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(event) =>
                      setAudioPlaceholderName(event.target.files?.[0]?.name ?? null)
                    }
                    disabled={isSubmitting}
                  />
                  <span className="btn btn-secondary btn-sm inline-flex cursor-pointer">
                    Choose audio file
                  </span>
                </label>
                <p className="text-xs text-text-muted mt-3">
                  {audioPlaceholderName
                    ? `Selected: ${audioPlaceholderName}`
                    : "No audio selected yet."}
                </p>
                <p className="text-xs text-accent-amber mt-2">
                  Real speech-to-text is coming soon. FrancScore V1 evaluates the typed transcript first.
                </p>
              </div>

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
                      <Target className="w-3 h-3 text-skill-speaking shrink-0" />
                      {criterion}
                    </div>
                  ))}
                </div>
              </div>

              {error ? (
                <div className="card p-4 border border-accent-rose/30 bg-accent-rose/10">
                  <p className="text-xs text-accent-rose">{error}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-brand-purple" />
              <h3 className="text-sm font-semibold">Past Speaking Submissions</h3>
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
                          {formatDate(new Date(item.submittedAt))}
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
                No speaking history yet. Your first reviewed submission will appear here.
              </div>
            )}
          </div>
        </div>

        <SpeakingReviewPanel
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
