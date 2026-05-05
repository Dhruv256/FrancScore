"use client";

import { useMemo, useState } from "react";
import { Award, Check, Zap } from "lucide-react";
import { BADGE_CATEGORIES } from "@/lib/constants";
import type { Badge } from "@/lib/types";

export function BadgesPageClient({ badges }: { badges: Badge[] }) {
  const [filter, setFilter] = useState<string>("all");
  const earned = useMemo(() => badges.filter((badge) => badge.progress === 100), [badges]);
  const inProgress = useMemo(() => badges.filter((badge) => badge.progress > 0 && badge.progress < 100), [badges]);
  const locked = useMemo(() => badges.filter((badge) => badge.progress === 0), [badges]);

  const filtered = useMemo(() => {
    if (filter === "all") return badges;
    if (filter === "earned") return earned;
    if (filter === "in-progress") return inProgress;
    return badges.filter((badge) => badge.category === filter);
  }, [badges, earned, filter, inProgress]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Award className="w-6 h-6 text-accent-amber" />
          Badges & Achievements
        </h1>
        <p className="text-sm text-text-secondary">
          {earned.length} earned · {inProgress.length} in progress · {locked.length} locked
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-4 card-glow-green">
          <div className="text-3xl font-bold gradient-text-green">{earned.length}</div>
          <div className="text-xs text-text-muted">Earned</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl font-bold text-accent-amber">{inProgress.length}</div>
          <div className="text-xs text-text-muted">In Progress</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-3xl font-bold text-text-muted">{badges.length}</div>
          <div className="text-xs text-text-muted">Total</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "earned", "in-progress", ...BADGE_CATEGORIES].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`btn btn-sm ${filter === value ? "btn-primary" : "btn-secondary"}`}
          >
            {value === "all" ? "All" : value === "earned" ? "Earned" : value === "in-progress" ? "In Progress" : value}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filtered.map((badge) => {
            const isEarned = badge.progress === 100;
            return (
              <div key={badge.id} className={`card p-5 relative overflow-hidden ${isEarned ? "card-glow-green" : ""}`}>
                {isEarned ? <div className="absolute top-0 left-0 right-0 h-0.5 gradient-green" /> : null}
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isEarned ? "bg-brand-green/10 border border-brand-green/20" : "bg-bg-input border border-border-default"}`}>
                    {badge.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">{badge.name}</h3>
                      {isEarned ? <Check className="w-4 h-4 text-brand-green shrink-0" /> : null}
                    </div>
                    <p className="text-xs text-text-muted mb-2">{badge.description}</p>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted">{badge.requirement}</span>
                        <span className={`font-medium ${isEarned ? "text-brand-green" : "text-text-secondary"}`}>{badge.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${isEarned ? "progress-fill-green" : "progress-fill-purple"}`} style={{ width: `${badge.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="badge badge-purple text-[10px]">{badge.category}</span>
                      <span className="flex items-center gap-1 text-xs text-brand-green">
                        <Zap className="w-3 h-3" />+{badge.xpReward} XP
                      </span>
                    </div>
                    {badge.earnedAt ? <p className="text-[10px] text-text-muted mt-2">Earned: {badge.earnedAt}</p> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Award className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
          <h3 className="text-sm font-semibold text-text-muted mb-2">No badges to show</h3>
          <p className="text-xs text-text-muted">Try a different filter or complete more activities to unlock progress.</p>
        </div>
      )}
    </div>
  );
}
