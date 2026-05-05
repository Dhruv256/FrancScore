import { ArrowRight, Calendar, Flame, Sparkles, Target, Zap } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DailyTaskCard } from "@/components/dashboard/DailyTaskCard";
import { ReadinessScoreCard } from "@/components/dashboard/ReadinessScoreCard";
import { SkillProgressCard } from "@/components/dashboard/SkillProgressCard";
import { WeaknessQuestCard } from "@/components/dashboard/WeaknessQuestCard";
import { getAuthContext, getProfileDisplayName } from "@/lib/auth";
import { mockDailyTasks, mockUser } from "@/lib/mock-data";
import { syncUserBadges } from "@/lib/gamification/badges";
import { getUserReadinessSnapshot } from "@/lib/gamification/readiness";
import { getWeaknessQuest } from "@/lib/gamification/weakness";
import { getPublishedDailyTasks } from "@/lib/live-data/server";
import {
  calculateLevel,
  daysUntil,
  formatExamType,
  formatGoalLevel,
  getStreakEmoji,
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your FrancScore dashboard: readiness score, daily tasks, skill progress, and weakness quests.",
};

export default async function DashboardPage() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    { readinessScore, skillProgress, totalQuestionsAttempted, overallAccuracy },
    badges,
    weaknessQuest,
    dailyTasks,
  ] = await Promise.all([
    getUserReadinessSnapshot(user.id),
    syncUserBadges(user.id),
    getWeaknessQuest(user.id),
    getPublishedDailyTasks().catch(() => []),
  ]);

  const displayName = getProfileDisplayName(profile, user);
  const targetExam = isTargetExam(profile?.target_exam)
    ? profile.target_exam
    : mockUser.targetExam;
  const targetLevel = isGoalLevel(profile?.target_level)
    ? profile.target_level
    : mockUser.targetLevel;
  const totalXp = profile?.total_xp ?? mockUser.totalXp;
  const currentStreak = profile?.current_streak ?? mockUser.currentStreak;
  const level = calculateLevel(totalXp);
  const daysLeft = profile?.exam_date ? daysUntil(new Date(profile.exam_date)) : null;
  const earnedBadgesCount = badges.filter((badge) => Boolean(badge.earnedAt)).length;

  return (
    <div className="space-y-7">
      <section className="surface-panel overflow-hidden rounded-[2rem] p-5 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px gradient-green" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="page-kicker mb-4">
              <Sparkles className="h-4 w-4" />
              Today&apos;s command center
            </div>
            <h1 className="display-title text-5xl sm:text-6xl">
              Bonjour, {displayName.split(" ")[0]}.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-text-secondary">
              <span className="badge badge-green mr-2">
                {formatExamType(targetExam)}
              </span>
              Targeting{" "}
              <span className="font-bold text-text-primary">
                {formatGoalLevel(targetLevel)}
              </span>{" "}
              with daily repair missions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[430px]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
              <div className="text-xs font-bold text-text-muted">Streak</div>
              <div className="mt-2 text-2xl font-black">
                {getStreakEmoji(currentStreak)} {currentStreak}
              </div>
              <div className="text-[11px] text-text-muted">days active</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
              <div className="flex items-center gap-1 text-xs font-bold text-text-muted">
                <Zap className="h-3 w-3 text-brand-green" />
                XP
              </div>
              <div className="mt-2 text-2xl font-black">
                {totalXp.toLocaleString()}
              </div>
              <div className="text-[11px] text-text-muted">Level {level}</div>
            </div>

            {daysLeft !== null ? (
              <div className="col-span-2 rounded-3xl border border-white/10 bg-white/[0.055] p-4 sm:col-span-1">
                <div className="flex items-center gap-1 text-xs font-bold text-text-muted">
                  <Calendar className="h-3 w-3 text-accent-amber" />
                  Exam
                </div>
                <div className="mt-2 text-2xl font-black">{daysLeft}</div>
                <div className="text-[11px] text-text-muted">days left</div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <ReadinessScoreCard score={readinessScore} />

      <section>
        <h2 className="mb-3 text-xl font-black">Skill Progress</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {skillProgress.map((skill) => (
            <SkillProgressCard key={skill.skill} skill={skill} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Flame className="h-5 w-5 text-accent-amber" />
              Daily War Mode
            </h2>
            <a
              href="/dashboard/war-mode"
              className="flex items-center gap-1 text-xs font-bold text-brand-green hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="space-y-2">
            {(dailyTasks.length ? dailyTasks : mockDailyTasks).map((task, index) => (
              <DailyTaskCard key={task.id} task={task} index={index} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black">
            <Target className="h-5 w-5 text-accent-rose" />
            Your Weakness
          </h2>
          <WeaknessQuestCard quest={weaknessQuest} />

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="card py-3 text-center">
              <div className="text-xl font-black">{totalQuestionsAttempted}</div>
              <div className="text-[10px] font-bold text-text-muted">Questions</div>
            </div>
            <div className="card py-3 text-center">
              <div className="text-xl font-black">{overallAccuracy}%</div>
              <div className="text-[10px] font-bold text-text-muted">Accuracy</div>
            </div>
            <div className="card py-3 text-center">
              <div className="text-xl font-black">{earnedBadgesCount}</div>
              <div className="text-[10px] font-bold text-text-muted">Badges</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function isTargetExam(value: string | null | undefined): value is typeof mockUser.targetExam {
  return value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED";
}

function isGoalLevel(value: string | null | undefined): value is typeof mockUser.targetLevel {
  return value === "B2" || value === "CLB_7" || value === "CLB_8";
}
