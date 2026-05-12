"use client";

import { useEffect } from "react";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { RotateCcw } from "lucide-react";
import type { FlashcardCard } from "@/lib/flashcards/types";
import { SWIPE_REVIEW_MAPPINGS, type SwipeReviewMapping } from "@/lib/vocabulary/review";
import { formatCEFRLevel, formatExamType, formatTopicType, formatVocabularyStatus } from "@/lib/utils";

type SwipeFlashcardProps = {
  card: FlashcardCard;
  isFlipped: boolean;
  disabled?: boolean;
  onFlip: () => void;
  onSwipe: (mapping: SwipeReviewMapping) => void;
};

const statusColors = {
  NEW: "bg-accent-blue/10 text-accent-blue",
  LEARNING: "bg-accent-amber/10 text-accent-amber",
  WEAK: "bg-accent-rose/10 text-accent-rose",
  MASTERED: "bg-status-success/10 text-status-success",
} as const;

export function SwipeFlashcard({
  card,
  isFlipped,
  disabled = false,
  onFlip,
  onSwipe,
}: SwipeFlashcardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimationControls();
  const rotate = useTransform(x, [-220, 0, 220], [-10, 0, 10]);
  const weakOpacity = useTransform(x, [-120, -30], [1, 0]);
  const strongOpacity = useTransform(x, [30, 120], [0, 1]);
  const masteredOpacity = useTransform(y, [-120, -30], [1, 0]);
  const skipOpacity = useTransform(y, [30, 120], [0, 1]);

  useEffect(() => {
    x.set(0);
    y.set(0);
    void controls.start({
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      rotate: 0,
      transition: { type: "spring", stiffness: 280, damping: 26 },
    });
  }, [card.id, controls, x, y]);

  return (
    <motion.div
      className="relative mx-auto w-full max-w-2xl touch-none select-none"
      style={{ x, y, rotate }}
      animate={controls}
      drag={!disabled}
      dragElastic={0.22}
      dragMomentum={false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={async (_, info) => {
        const horizontal = Math.abs(info.offset.x);
        const vertical = Math.abs(info.offset.y);
        const threshold = 95;

        if (horizontal < threshold && vertical < threshold) {
          await controls.start({
            x: 0,
            y: 0,
            rotate: 0,
            transition: { type: "spring", stiffness: 500, damping: 34 },
          });
          return;
        }

        if (horizontal >= vertical) {
          const mapping = info.offset.x < 0 ? SWIPE_REVIEW_MAPPINGS.left : SWIPE_REVIEW_MAPPINGS.right;
          await controls.start({
            x: info.offset.x < 0 ? -520 : 520,
            y: info.offset.y * 0.35,
            opacity: 0,
            rotate: info.offset.x < 0 ? -18 : 18,
            transition: { type: "tween", duration: 0.22, ease: "easeOut" },
          });
          onSwipe(mapping);
          return;
        }

        const mapping = info.offset.y < 0 ? SWIPE_REVIEW_MAPPINGS.up : SWIPE_REVIEW_MAPPINGS.down;
        await controls.start({
          x: info.offset.x * 0.25,
          y: info.offset.y < 0 ? -560 : 560,
          opacity: 0,
          scale: 0.96,
          transition: { type: "tween", duration: 0.22, ease: "easeOut" },
        });
        onSwipe(mapping);
      }}
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
    >
      <SwipeLabel label="WEAK" className="left-5 top-7 border-accent-rose text-accent-rose" style={{ opacity: weakOpacity }} />
      <SwipeLabel label="STRONG" className="right-5 top-7 border-status-success text-status-success" style={{ opacity: strongOpacity }} />
      <SwipeLabel label="MASTERED" className="left-1/2 top-6 -translate-x-1/2 border-brand-green text-brand-green" style={{ opacity: masteredOpacity }} />
      <SwipeLabel label="SKIP" className="bottom-7 left-1/2 -translate-x-1/2 border-text-muted text-text-muted" style={{ opacity: skipOpacity }} />

      <button
        type="button"
        onClick={onFlip}
        disabled={disabled}
        className="flashcard w-full text-left"
        aria-label={isFlipped ? "Show French word" : "Show answer"}
        style={{ minHeight: "430px" }}
      >
        {!isFlipped ? <FlashcardFront card={card} /> : <FlashcardBack card={card} />}
      </button>
    </motion.div>
  );
}

function FlashcardFront({ card }: { card: FlashcardCard }) {
  return (
    <div
      className="card-dark-premium flex min-h-[430px] flex-col items-center justify-center rounded-[2rem] p-8 text-center shadow-[0_30px_80px_rgba(8,8,8,0.28)]"
    >
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <span className="badge badge-blue">{formatCEFRLevel(card.cefrLevel)}</span>
        {card.topic ? <span className="badge badge-purple">{formatTopicType(card.topic)}</span> : null}
        <span className={`badge border-none ${statusColors[card.status]}`}>
          {formatVocabularyStatus(card.status)}
        </span>
      </div>
      <h2 className="display-title mb-5 break-words text-center text-6xl text-text-inverse sm:text-7xl">
        {card.frenchWord}
      </h2>
      <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-text-muted">
        <RotateCcw className="h-3.5 w-3.5" />
        Tap to flip
      </p>
    </div>
  );
}

function FlashcardBack({ card }: { card: FlashcardCard }) {
  return (
    <div className="card-soft min-h-[430px] rounded-[2rem] p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="badge badge-blue">{formatCEFRLevel(card.cefrLevel)}</span>
        {card.topic ? <span className="badge badge-purple">{formatTopicType(card.topic)}</span> : null}
        <span className={`badge border-none ${statusColors[card.status]}`}>
          {formatVocabularyStatus(card.status)}
        </span>
        <span className="badge badge-green">{formatCardExamType(card.examType)}</span>
      </div>

      <h3 className="mb-4 text-4xl font-black">{card.frenchWord}</h3>

      <div className="mb-5">
        <span className="text-xs uppercase tracking-wider text-text-muted">Meaning</span>
        <p className="text-2xl font-black text-brand-green">{card.englishMeaning}</p>
      </div>

      <div className="space-y-3 rounded-3xl border border-[rgba(17,17,17,0.08)] bg-[#fffaf0]/80 p-5">
        <p className="text-sm text-text-secondary">
          <span className="mr-2 text-xs font-medium text-brand-green">FR:</span>
          {card.frenchExample ?? "No French example yet."}
        </p>
        <p className="text-sm text-text-muted">
          <span className="mr-2 text-xs font-medium text-accent-blue">EN:</span>
          {card.englishExampleTranslation ?? "No English translation yet."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {card.tags.map((tag, index) => (
          <span key={`${card.id}-${tag}-${index}`} className="badge badge-purple text-[10px]">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function SwipeLabel({
  label,
  className,
  style,
}: {
  label: string;
  className: string;
  style: { opacity: MotionValue<number> };
}) {
  return (
    <motion.div
      className={`pointer-events-none absolute z-20 rounded-2xl border-2 bg-white/90 px-4 py-2 text-sm font-black tracking-[0.2em] shadow-lg ${className}`}
      style={style}
    >
      {label}
    </motion.div>
  );
}

function formatCardExamType(examType: string) {
  if (examType === "BOTH") {
    return "Both";
  }

  if (examType === "TEF_CANADA" || examType === "TCF_CANADA" || examType === "MIXED") {
    return formatExamType(examType);
  }

  return examType;
}
