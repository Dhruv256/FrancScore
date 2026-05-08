"use client";

import type { FlashcardCard } from "@/lib/flashcards/types";
import { type SwipeReviewMapping } from "@/lib/vocabulary/review";
import { SwipeFlashcard } from "@/components/vocabulary/SwipeFlashcard";

export function FlashcardDeck({
  card,
  isFlipped,
  disabled,
  onFlip,
  onSwipe,
}: {
  card: FlashcardCard;
  isFlipped: boolean;
  disabled?: boolean;
  onFlip: () => void;
  onSwipe: (mapping: SwipeReviewMapping) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2 text-center text-[11px] font-black uppercase tracking-[0.12em] text-text-muted sm:hidden">
        <span>← Weak</span>
        <span>→ Strong</span>
        <span>↑ Mastered</span>
        <span>↓ Skip</span>
      </div>
      <SwipeFlashcard
        card={card}
        isFlipped={isFlipped}
        disabled={disabled}
        onFlip={onFlip}
        onSwipe={onSwipe}
      />
    </div>
  );
}
