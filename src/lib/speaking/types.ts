import type { CEFRLevel, ExamType, SpeakingFeedback, SpeakingPrompt } from "@/lib/types";

export type SpeakingPromptOption = SpeakingPrompt;

export type SpeakingSubmissionHistoryItem = {
  id: string;
  promptId: string;
  promptTitle: string;
  examType: ExamType;
  status: string;
  submittedAt: string;
  estimatedCefr: CEFRLevel | null;
  score20: number | null;
  transcript: string | null;
  audioPath: string | null;
  review: SpeakingFeedback | null;
};
