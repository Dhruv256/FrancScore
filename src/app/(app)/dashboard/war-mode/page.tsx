import { redirect } from "next/navigation";
import { Flame, Zap, Trophy, Check } from "lucide-react";
import { DailyTaskCard } from "@/components/dashboard/DailyTaskCard";
import { getAuthContext } from "@/lib/auth";
import { getPublishedDailyTasks } from "@/lib/live-data/server";
import { mockDailyTasks, mockUser } from "@/lib/mock-data";
import { getStreakEmoji } from "@/lib/utils";

export default async function WarModePage() {
  const { user, profile } = await getAuthContext();
  if (!user) {
    redirect("/auth/login");
  }

  const tasks = await getPublishedDailyTasks().catch(() => []);
  const resolvedTasks = tasks.length ? tasks : mockDailyTasks;
  const completedTasks = resolvedTasks.filter((t) => t.status === "DONE");
  const totalXPToday = completedTasks.reduce((sum, t) => sum + t.xpReward, 0);
  const totalXPAvailable = resolvedTasks.reduce((sum, t) => sum + t.xpReward, 0);
  const currentStreak = profile?.current_streak ?? mockUser.currentStreak;
  const completionPercentage = resolvedTasks.length
    ? Math.round((completedTasks.length / resolvedTasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Flame className="w-6 h-6 text-accent-amber" />
          Daily War Mode
        </h1>
        <p className="text-sm text-text-secondary">
          Complete today&apos;s missions to earn XP and maintain your streak.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center py-4">
          <div className="text-3xl mb-1">{getStreakEmoji(currentStreak)}</div>
          <div className="text-2xl font-bold">{currentStreak}</div>
          <div className="text-xs text-text-muted">Day Streak</div>
        </div>
        <div className="card text-center py-4">
          <Zap className="w-6 h-6 text-brand-green mx-auto mb-1" />
          <div className="text-2xl font-bold">{totalXPToday}</div>
          <div className="text-xs text-text-muted">XP Earned Today</div>
        </div>
        <div className="card text-center py-4">
          <Check className="w-6 h-6 text-status-success mx-auto mb-1" />
          <div className="text-2xl font-bold">
            {completedTasks.length}/{resolvedTasks.length}
          </div>
          <div className="text-xs text-text-muted">Tasks Complete</div>
        </div>
        <div className="card text-center py-4">
          <Trophy className="w-6 h-6 text-accent-amber mx-auto mb-1" />
          <div className="text-2xl font-bold">{totalXPAvailable}</div>
          <div className="text-xs text-text-muted">Total XP Available</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Today&apos;s Progress</span>
          <span className="text-sm text-brand-green font-medium">
            {completionPercentage}%
          </span>
        </div>
        <div className="progress-bar h-3">
          <div
            className="progress-fill progress-fill-green h-3"
            style={{
              width: `${completionPercentage}%`,
            }}
          />
        </div>
      </div>

      {/* Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Missions</h2>
        <div className="space-y-2">
          {resolvedTasks.map((task, i) => (
            <DailyTaskCard key={task.id} task={task} index={i} />
          ))}
        </div>
      </div>

      {/* Streak calendar preview */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-3">This Week</h3>
        <div className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
            <div key={day} className="text-center">
              <div className="text-xs text-text-muted mb-2">{day}</div>
              <div
                className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-sm ${
                  i < 4
                    ? "bg-brand-green/20 text-brand-green"
                    : i === 4
                    ? "bg-brand-green/10 border border-brand-green/30 text-brand-green"
                    : "bg-bg-input text-text-muted"
                }`}
              >
                {i < 4 ? "✓" : i === 4 ? "•" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
