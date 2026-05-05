"use client";

import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Library,
  Check,
  Lock,
  Clock,
  Zap,
} from "lucide-react";
import type { DailyTask } from "@/lib/types";

const taskIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Library,
};

interface Props {
  task: DailyTask;
  index: number;
}

export function DailyTaskCard({ task, index }: Props) {
  const Icon = taskIcons[task.icon] || Library;
  const isDone = task.status === "DONE";
  const isLocked = task.status === "LOCKED";

  return (
    <div
      className={`flex items-center gap-4 rounded-3xl border p-3 transition-all ${
        isDone
          ? "bg-brand-green/5 border-brand-green/20"
        : isLocked
          ? "bg-white/[0.035] border-border-default opacity-55"
          : "bg-white/[0.055] border-border-default hover:border-brand-green/30 hover:bg-white/[0.08] cursor-pointer"
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Status icon */}
      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
          isDone
            ? "bg-brand-green/20"
            : isLocked
            ? "bg-white/5"
            : "bg-brand-purple/10"
        }`}
      >
        {isDone ? (
          <Check className="w-4 h-4 text-brand-green" />
        ) : isLocked ? (
          <Lock className="w-4 h-4 text-text-muted" />
        ) : (
          <Icon className="w-4 h-4 text-brand-purple" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-black ${
            isDone ? "line-through text-text-muted" : ""
          }`}
        >
          {task.title}
        </div>
        <div className="text-xs text-text-muted truncate">
          {task.description}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="w-3 h-3" />
          {task.estimatedMinutes}m
        </div>
        <div className="flex items-center gap-1 text-xs font-black text-brand-green">
          <Zap className="w-3 h-3" />
          +{task.xpReward}
        </div>
      </div>
    </div>
  );
}
