import { z } from "zod";
import type {
  CEFRLevel,
  ExamType,
  MockTestResult,
  RepairPlanDay,
  SkillType,
  TopicType,
  TrapType,
  WritingPrompt,
  SpeakingPrompt,
} from "@/lib/types";

export type MockSelectableTest = {
  id: string;
  title: string;
  description: string | null;
  examType: ExamType;
  totalDuration: number;
  isCompleted: boolean;
  sections: Array<{
    id: string;
    skill: Exclude<SkillType, "VOCABULARY">;
    questionCount: number;
    durationMinutes: number;
  }>;
};

export type MockMcqItem = {
  id: string;
  skill: "LISTENING" | "READING";
  questionText: string;
  options: string[];
  topic: TopicType | null;
  trapType: TrapType | null;
  difficulty: string;
  explanation: string | null;
  passage: {
    id: string;
    title: string;
    content: string;
  } | null;
  audioUrl: string | null;
  transcript: string | null;
};

export type MockSessionPayload = {
  test: MockSelectableTest;
  listening: MockMcqItem[];
  reading: MockMcqItem[];
  writingPrompt: WritingPrompt | null;
  speakingPrompt: SpeakingPrompt | null;
};

export type MockMistakeReviewItem = {
  questionId: string;
  skill: "LISTENING" | "READING";
  questionText: string;
  selectedAnswerIndex: number | null;
  correctAnswerIndex: number;
  options: string[];
  explanation: string | null;
  trapType: TrapType | null;
  topic: TopicType | null;
};

export type MockCompletionResult = MockTestResult & {
  writingScore: number;
  speakingScore: number;
  weakTrapTypes: TrapType[];
  reviewMistakes: MockMistakeReviewItem[];
  repairPlan: RepairPlanDay[];
};

export const mockCompleteRequestSchema = z.object({
  mockTestId: z.string().uuid(),
  answers: z.record(z.string(), z.number().int().min(0).max(3).nullable()),
  writingResponse: z.string().trim().max(12000).optional().default(""),
  speakingTranscript: z.string().trim().max(12000).optional().default(""),
});

export type MockCompleteRequest = z.infer<typeof mockCompleteRequestSchema>;

export type MockSkillComputation = {
  skill: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  score: number;
  cefrEstimate: CEFRLevel;
  weakAreas: string[];
};
