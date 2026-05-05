"use client";

import { AlertTriangle, ArrowRight, Zap } from "lucide-react";
import type { WeaknessQuest } from "@/lib/types";

interface Props {
  quest: WeaknessQuest | null;
}

export function WeaknessQuestCard({ quest }: Props) {
  if (!quest) {
    return (
      <div className="card card-glow-purple relative overflow-hidden rounded-[2rem] p-5">
        <div className="absolute inset-x-0 top-0 h-px gradient-purple" />

        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-accent-rose" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black mb-0.5">Weakness Quest</h3>
            <p className="text-xs text-text-muted">No major weakness detected yet</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed">
          Keep practicing reading and listening drills. FrancScore will surface a targeted
          weakness quest once you have enough attempts for a meaningful signal.
        </p>
      </div>
    );
  }

  return (
    <div className="card card-glow-purple relative overflow-hidden rounded-[2rem] p-5">
      <div className="absolute inset-x-0 top-0 h-px gradient-purple" />

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-accent-rose" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black mb-0.5">Weakness Quest</h3>
          <p className="text-xs text-text-muted">{quest.title}</p>
        </div>
      </div>

      <p className="text-sm text-text-secondary mb-4 leading-relaxed">
        {quest.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="badge badge-red">
            {quest.difficulty}
          </span>
          <span className="text-xs text-text-muted">
            {quest.questionsCount} questions
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-brand-green">
            <Zap className="w-3 h-3" />
            +{quest.xpReward} XP
          </span>
        </div>
        <button className="btn btn-primary btn-sm">
          Start Quest
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
