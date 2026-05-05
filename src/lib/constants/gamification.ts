import type {
  BadgeCategory,
  FlashcardDeckType,
  FlashcardReviewRating,
  TaskStatus,
  VocabularyStatus,
} from "@/lib/types";

export const BADGE_CATEGORIES: BadgeCategory[] = [
  "LISTENING",
  "READING",
  "WRITING",
  "SPEAKING",
  "VOCABULARY",
  "MOCK_TEST",
  "STREAK",
  "MASTERY",
];

export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
  VOCABULARY: "Vocabulary",
  MOCK_TEST: "Mock Test",
  STREAK: "Streak",
  MASTERY: "Mastery",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  DONE: "Done",
  PENDING: "Pending",
  LOCKED: "Locked",
};

export const VOCABULARY_STATUS_LABELS: Record<VocabularyStatus, string> = {
  NEW: "New",
  LEARNING: "Learning",
  WEAK: "Weak",
  MASTERED: "Mastered",
};

export const FLASHCARD_REVIEW_RATINGS: FlashcardReviewRating[] = [
  "AGAIN",
  "HARD",
  "GOOD",
  "EASY",
];

export const FLASHCARD_REVIEW_LABELS: Record<FlashcardReviewRating, string> = {
  AGAIN: "Again",
  HARD: "Hard",
  GOOD: "Good",
  EASY: "Easy",
};

export const FLASHCARD_DECK_TYPES: FlashcardDeckType[] = [
  "ALL",
  "WEAK_WORDS",
  "HIGH_FREQUENCY",
  "TOPIC",
  "TRAP_WORDS",
  "CONNECTORS",
  "LISTENING_TRAPS",
  "CUSTOM",
];

export const FLASHCARD_DECK_LABELS: Record<FlashcardDeckType, string> = {
  ALL: "All Vocabulary",
  WEAK_WORDS: "Weak Words",
  HIGH_FREQUENCY: "Exam High-Frequency",
  TOPIC: "Topic Mode",
  TRAP_WORDS: "Trap Words",
  CONNECTORS: "Connectors",
  LISTENING_TRAPS: "Listening Traps",
  CUSTOM: "Custom Deck",
};

export const FLASHCARD_MODES = [
  { id: "ALL", label: "All Vocabulary", icon: "Library", emoji: "📚" },
  { id: "WEAK_WORDS", label: "Weak Words", icon: "AlertTriangle", emoji: "⚠️" },
  { id: "HIGH_FREQUENCY", label: "Exam High-Frequency", icon: "TrendingUp", emoji: "📈" },
  { id: "TOPIC", label: "Topic Mode", icon: "Tag", emoji: "🏷️" },
  { id: "TRAP_WORDS", label: "Trap Words", icon: "ShieldAlert", emoji: "🛡️" },
  { id: "CONNECTORS", label: "Connectors", icon: "Link", emoji: "🔗" },
  { id: "LISTENING_TRAPS", label: "Listening Traps", icon: "Headphones", emoji: "🎧" },
  { id: "CUSTOM", label: "Custom Deck", icon: "Settings", emoji: "⚙️" },
] as const satisfies ReadonlyArray<{
  id: FlashcardDeckType;
  label: string;
  icon: string;
  emoji: string;
}>;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "War Mode", href: "/dashboard/war-mode", icon: "Swords" },
  { label: "Listening Lab", href: "/practice/listening", icon: "Headphones" },
  { label: "Reading Lab", href: "/practice/reading", icon: "BookOpen" },
  { label: "Writing Coach", href: "/practice/writing", icon: "PenTool" },
  { label: "Speaking Coach", href: "/practice/speaking", icon: "Mic" },
  { label: "Vocabulary", href: "/vocabulary", icon: "Library" },
  { label: "Flashcards", href: "/vocabulary/flashcards", icon: "Layers" },
  { label: "Mock Tests", href: "/mocks", icon: "FileCheck" },
  { label: "Progress", href: "/progress", icon: "BarChart3" },
  { label: "Badges", href: "/badges", icon: "Award" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: "LayoutDashboard" },
  { label: "Questions", href: "/admin/questions", icon: "HelpCircle" },
  { label: "Vocabulary", href: "/admin/vocabulary", icon: "Library" },
  { label: "Passages", href: "/admin/passages", icon: "BookOpen" },
  { label: "Writing Prompts", href: "/admin/writing", icon: "PenTool" },
  { label: "Speaking Prompts", href: "/admin/speaking", icon: "Mic" },
  { label: "Listening Audio", href: "/admin/listening", icon: "Headphones" },
] as const;
