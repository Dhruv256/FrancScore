import type {
  CEFRLevel,
  DifficultyLevel,
  ExamType,
  SkillType,
  TopicType,
  TrapType,
} from "@/lib/types";

export type PracticeSkill = Extract<SkillType, "LISTENING" | "READING">;
export type PracticeExamFilter = ExamType | "ALL";
export type PracticeLevelFilter = CEFRLevel | "ALL";
export type PracticeTopicFilter = TopicType | "ALL";
export type PracticeTrapFilter = TrapType | "ALL";
export type PracticeMode = "learning" | "timed";

export type PracticeFilters = {
  examType: PracticeExamFilter;
  skill: PracticeSkill;
  level: PracticeLevelFilter;
  topic: PracticeTopicFilter;
  trapType: PracticeTrapFilter;
};

export type PracticePassage = {
  id: string;
  title: string;
  content: string;
  transcript: string | null;
  audioUrl: string | null;
  type: string | null;
  highlightedVocabulary: string[];
  wordCount: number | null;
  estimatedMinutes: number | null;
};

export type PracticeQuestion = {
  id: string;
  skill: PracticeSkill;
  examType: string;
  level: CEFRLevel;
  topic: TopicType | null;
  difficulty: DifficultyLevel;
  prompt: string;
  options: string[];
  trapType: TrapType | null;
  tags: string[];
  audioUrl: string | null;
  hasTranscript: boolean;
  passageId: string | null;
  passage: PracticePassage | null;
};

export type PracticeProgressSummary = {
  skillAccuracy: number;
  totalAttempted: number;
  recentWeakTrapTypes: TrapType[];
};

export type PracticeQuestionListResponse = {
  filters: PracticeFilters;
  items: PracticeQuestion[];
  progress: PracticeProgressSummary;
};

export type PracticeAttemptRequest = {
  questionId: string;
  selectedAnswerIndex: number;
  timeTakenSeconds: number;
  mode: PracticeMode;
};

export type PracticeAttemptResponse = {
  questionId: string;
  correctAnswerIndex: number;
  isCorrect: boolean;
  explanation: string | null;
  trapType: TrapType | null;
  transcript: string | null;
  progress: PracticeProgressSummary;
};
