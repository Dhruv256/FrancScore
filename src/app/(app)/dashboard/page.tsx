import { ArrowRight, Calendar, Flame, Sparkles, Target, Zap } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DailyTaskCard } from "@/components/dashboard/DailyTaskCard";
import { ReadinessScoreCard } from "@/components/dashboard/ReadinessScoreCard";
import { SkillProgressCard } from "@/components/dashboard/SkillProgressCard";
import { WeaknessQuestCard } from "@/components/dashboard/WeaknessQuestCard";
import { getAuthContext, getProfileDisplayName } from "@/lib/auth";
import { syncUserBadges } from "@/lib/gamification/badges";
import { getUserReadinessSnapshot } from "@/lib/gamification/readiness";
import { getWeaknessQuest } from "@/lib/gamification/weakness";
import { getPublishedDailyTasks } from "@/lib/live-data/server";
import {
  calculateLevel,
  daysUntil,
  formatExamType,
  formatGoalLevel,
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
    getPublishedDailyTasks(user.id).catch(() => []),
  ]);

  const displayName = getProfileDisplayName(profile, user);
  const targetExam = isTargetExam(profile?.target_exam) ? profile.target_exam : null;
  const targetLevel = isGoalLevel(profile?.target_level) ? profile.target_level : null;
  const totalXp = profile?.total_xp ?? 0;
  const currentStreak = profile?.current_streak ?? 0;
  const level = calculateLevel(totalXp);
  const daysLeft = profile?.exam_date ? daysUntil(new Date(profile.exam_date)) : null;
  const earnedBadgesCount = badges.filter((badge) => Boolean(badge.earnedAt)).length;

  return (
    <div className="space-y-7">
      <section className="card-soft overflow-hidden rounded-[2rem] p-5 sm:p-7">
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
              {targetExam ? (
                <span className="badge badge-green mr-2">
                  {formatExamType(targetExam)}
                </span>
              ) : null}
              {targetExam && targetLevel ? (
                <>
                  Targeting{" "}
                  <span className="font-bold text-text-primary">
                    {formatGoalLevel(targetLevel)}
                  </span>{" "}
                  with live repair missions.
                </>
              ) : (
                "Complete onboarding to lock your target exam, level, and daily study rhythm."
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[430px]">
            <div className="rounded-3xl border border-[rgba(17,17,17,0.08)] bg-[#fffaf0]/80 p-4 shadow-[0_16px_40px_rgba(17,17,17,0.06)]">
              <div className="text-xs font-bold text-text-muted">Streak</div>
              <div className="mt-2 flex items-center gap-2 text-2xl font-black">
                <Flame className="h-5 w-5 text-brand-green" />
                {currentStreak}
              </div>
              <div className="text-[11px] text-text-muted">days active</div>
            </div>

            <div className="rounded-3xl border border-[rgba(17,17,17,0.08)] bg-[#fffaf0]/80 p-4 shadow-[0_16px_40px_rgba(17,17,17,0.06)]">
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
              <div className="col-span-2 rounded-3xl border border-[rgba(17,17,17,0.08)] bg-[#fffaf0]/80 p-4 shadow-[0_16px_40px_rgba(17,17,17,0.06)] sm:col-span-1">
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
            {dailyTasks.length ? (
              dailyTasks.map((task, index) => (
                <DailyTaskCard key={task.id} task={task} index={index} />
              ))
            ) : (
              <EmptyDashboardCard
                title="No live daily tasks yet"
                description="Seed FrancScore learning data or publish tasks from the admin CMS to populate War Mode with real missions."
                href="/admin"
                cta="Open admin CMS"
              />
            )}
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

function isTargetExam(value: string | null | undefined): value is "TEF_CANADA" | "TCF_CANADA" | "MIXED" {
  return value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED";
}

function isGoalLevel(value: string | null | undefined): value is "B2" | "CLB_7" | "CLB_8" {
  return value === "B2" || value === "CLB_7" || value === "CLB_8";
}

function EmptyDashboardCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-[rgba(244,238,221,0.16)] bg-[linear-gradient(145deg,rgba(244,238,221,0.16),rgba(244,238,221,0.05))] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <p className="page-kicker mb-3">Live data required</p>
      <h3 className="text-lg font-black text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
      <a href={href} className="btn btn-secondary mt-4">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
