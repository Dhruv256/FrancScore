import type { FlashcardReviewAction } from "@/lib/flashcards/types";
import type { FlashcardReviewRating } from "@/lib/types";

export type SwipeReviewDirection = "left" | "right" | "up" | "down";

export type SwipeReviewMapping = {
  direction: SwipeReviewDirection;
  label: "WEAK" | "STRONG" | "MASTERED" | "SKIP";
  rating: FlashcardReviewRating;
  action: FlashcardReviewAction;
};

export const SWIPE_REVIEW_MAPPINGS: Record<SwipeReviewDirection, SwipeReviewMapping> = {
  left: {
    direction: "left",
    label: "WEAK",
    rating: "AGAIN",
    action: "RATE",
  },
  right: {
    direction: "right",
    label: "STRONG",
    rating: "GOOD",
    action: "RATE",
  },
  up: {
    direction: "up",
    label: "MASTERED",
    rating: "EASY",
    action: "MARK_MASTERED",
  },
  down: {
    direction: "down",
    label: "SKIP",
    rating: "HARD",
    action: "SKIP",
  },
};
