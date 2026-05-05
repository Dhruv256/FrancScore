import type {
  CEFRLevel,
  ExamType,
  FlashcardDeckType,
  FlashcardReviewRating,
  TopicType,
  TrapType,
  VocabularyStatus,
} from "@/lib/types";

export type FlashcardDeckFilter = {
  deckType: FlashcardDeckType;
  cefrLevel: CEFRLevel | "ALL";
  topic: TopicType | "ALL";
  examType: ExamType | "ALL";
  status: VocabularyStatus | "ALL";
};

export type FlashcardCard = {
  id: string;
  frenchWord: string;
  englishMeaning: string;
  frenchExample: string | null;
  englishExampleTranslation: string | null;
  cefrLevel: CEFRLevel;
  topic: TopicType | null;
  examType: string;
  frequencyScore: number;
  tags: string[];
  status: VocabularyStatus;
  reviewCount: number;
  easeScore: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  correctCount: number;
  mistakeCount: number;
  isWeakWord: boolean;
  isMastered: boolean;
  trapType: TrapType | null;
};

export type FlashcardDeckResponse = {
  cards: FlashcardCard[];
  filter: FlashcardDeckFilter;
};

export type FlashcardSessionPayload = {
  deckType: FlashcardDeckType;
  totalCards: number;
};

export type FlashcardSessionResponse = {
  sessionId: string;
};

export type FlashcardReviewAction =
  | "RATE"
  | "MARK_MASTERED"
  | "SAVE_WEAK";

export type FlashcardReviewPayload = {
  sessionId: string;
  vocabularyId: string;
  rating: FlashcardReviewRating;
  action: FlashcardReviewAction;
};

export type FlashcardReviewResult = {
  vocabularyId: string;
  xpEarned: number;
  status: VocabularyStatus;
  nextReviewAt: string;
  correctCount: number;
  mistakeCount: number;
  reviewCount: number;
};
