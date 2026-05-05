"use client";

import { AlertTriangle, BarChart3, Target } from "lucide-react";
import type { PracticeProgressSummary } from "@/lib/practice/types";
import { formatTrapType } from "@/lib/utils";

type PracticeProgressPanelProps = {
  progress: PracticeProgressSummary;
  accentClassName: string;
};

export function PracticeProgressPanel({
  progress,
  accentClassName,
}: PracticeProgressPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 text-text-muted mb-2">
          <Target className={`w-4 h-4 ${accentClassName}`} />
          <span className="text-xs uppercase tracking-wider">Accuracy</span>
        </div>
        <div className="text-2xl font-bold">{progress.skillAccuracy}%</div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-text-muted mb-2">
          <BarChart3 className={`w-4 h-4 ${accentClassName}`} />
          <span className="text-xs uppercase tracking-wider">Attempts</span>
        </div>
        <div className="text-2xl font-bold">{progress.totalAttempted}</div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-text-muted mb-2">
          <AlertTriangle className={`w-4 h-4 ${accentClassName}`} />
          <span className="text-xs uppercase tracking-wider">Weak Traps</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {progress.recentWeakTrapTypes.length ? (
            progress.recentWeakTrapTypes.map((trapType) => (
              <span key={trapType} className="badge badge-amber text-xs">
                {formatTrapType(trapType)}
              </span>
            ))
          ) : (
            <span className="text-sm text-text-muted">No recurring traps yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
