"use client";

import { ChevronLeft, ChevronRight, Flag } from "lucide-react";

export type QuestionNavigatorStatus =
  | "current"
  | "unanswered"
  | "answered"
  | "correct"
  | "incorrect"
  | "flagged";

export type QuestionNavigatorItem = {
  id: string;
  label: string;
  status: Exclude<QuestionNavigatorStatus, "current">;
  flagged?: boolean;
};

export function QuestionNavigator({
  items,
  currentIndex,
  onJump,
  onPrevious,
  onNext,
  onToggleFlag,
}: {
  items: QuestionNavigatorItem[];
  currentIndex: number;
  onJump: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleFlag: () => void;
}) {
  const current = items[currentIndex];

  return (
    <div className="sticky top-3 z-20 rounded-[1.5rem] border border-[rgba(17,17,17,0.08)] bg-[#f7f2e8]/95 p-3 shadow-[0_18px_60px_rgba(17,17,17,0.08)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-text-muted">
            Question {currentIndex + 1} of {items.length}
          </p>
          <p className="text-sm font-bold text-text-primary">
            {current?.flagged ? "Flagged for review" : "Exam navigator"}
          </p>
        </div>
        <button type="button" onClick={onToggleFlag} className="btn btn-ghost btn-sm">
          <Flag className={`h-4 w-4 ${current?.flagged ? "fill-accent-amber text-accent-amber" : ""}`} />
          Flag
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item, index) => {
          const isCurrent = index === currentIndex;
          const status = isCurrent ? "current" : item.flagged ? "flagged" : item.status;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump(index)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${getStatusClass(status)}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onPrevious} className="btn btn-secondary btn-sm">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button type="button" onClick={onNext} className="btn btn-primary btn-sm">
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function getStatusClass(status: QuestionNavigatorStatus) {
  switch (status) {
    case "current":
      return "border-brand-green bg-brand-green text-[#111]";
    case "correct":
      return "border-status-success/30 bg-status-success/15 text-status-success";
    case "incorrect":
      return "border-accent-rose/30 bg-accent-rose/15 text-accent-rose";
    case "answered":
      return "border-accent-blue/30 bg-accent-blue/10 text-accent-blue";
    case "flagged":
      return "border-accent-amber/40 bg-accent-amber/15 text-accent-amber";
    default:
      return "border-[rgba(17,17,17,0.08)] bg-white/70 text-text-secondary";
  }
}
