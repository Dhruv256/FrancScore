import { redirect } from "next/navigation";
import { ProgressPageClient } from "@/components/progress/ProgressPageClient";
import { getAuthContext } from "@/lib/auth";
import { getUserReadinessSnapshot } from "@/lib/gamification/readiness";
import { getProgressAnalytics } from "@/lib/live-data/server";

export default async function ProgressPage() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ readinessScore, skillProgress, totalQuestionsAttempted }, analyticsData] = await Promise.all([
    getUserReadinessSnapshot(user.id),
    getProgressAnalytics(user.id),
  ]);

  return (
    <ProgressPageClient
      analyticsData={analyticsData}
      readinessScore={readinessScore}
      skillProgress={skillProgress}
      totalXp={profile?.total_xp ?? 0}
      currentStreak={profile?.current_streak ?? 0}
      totalQuestions={totalQuestionsAttempted}
    />
  );
}
