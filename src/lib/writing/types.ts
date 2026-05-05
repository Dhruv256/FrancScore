import type { CEFRLevel, ExamType, WritingFeedback, WritingPrompt } from "@/lib/types";

export type WritingPromptOption = WritingPrompt;

export type WritingSubmissionHistoryItem = {
  id: string;
  promptId: string;
  promptTitle: string;
  examType: ExamType;
  status: string;
  wordCount: number;
  submittedAt: string;
  estimatedCefr: CEFRLevel | null;
  score20: number | null;
  review: WritingFeedback | null;
};
