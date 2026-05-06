import { redirect } from "next/navigation";
import { Check, Flame, Trophy, Zap } from "lucide-react";
import { DailyTaskCard } from "@/components/dashboard/DailyTaskCard";
import { getAuthContext } from "@/lib/auth";
import { getPublishedDailyTasks } from "@/lib/live-data/server";

export default async function WarModePage() {
  const { user, profile } = await getAuthContext();
  if (!user) {
    redirect("/auth/login");
  }

  const resolvedTasks = await getPublishedDailyTasks(user.id).catch(() => []);
  const completedTasks = resolvedTasks.filter((task) => task.status === "DONE");
  const totalXPToday = completedTasks.reduce((sum, task) => sum + task.xpReward, 0);
  const totalXPAvailable = resolvedTasks.reduce((sum, task) => sum + task.xpReward, 0);
  const currentStreak = profile?.current_streak ?? 0;
  const completionPercentage = resolvedTasks.length
    ? Math.round((completedTasks.length / resolvedTasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Flame className="w-6 h-6 text-accent-amber" />
          Daily War Mode
        </h1>
        <p className="text-sm text-text-secondary">
          Complete today&apos;s live missions to earn XP and maintain your streak.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card text-center py-4">
          <Flame className="w-6 h-6 text-brand-green mx-auto mb-1" />
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
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Missions</h2>
        {resolvedTasks.length ? (
          <div className="space-y-2">
            {resolvedTasks.map((task, index) => (
              <DailyTaskCard key={task.id} task={task} index={index} />
            ))}
          </div>
        ) : (
          <div className="surface-panel rounded-[2rem] p-6">
            <p className="page-kicker mb-3">Live data required</p>
            <h3 className="text-2xl font-black text-text-primary">No published missions yet.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
              FrancScore now relies on real Supabase content only. Seed
              {" "}
              <code>supabase/seed/francscore_initial_learning_data.sql</code>
              {" "}
              or publish daily tasks in the admin CMS to activate War Mode.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
