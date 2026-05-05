import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getAuthContext, getProfileDisplayName, isOnboardingComplete } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/auth/login");
  }

  if (!isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  return (
    <div className="app-shell min-h-screen">
      <Sidebar
        userSummary={{
          fullName: getProfileDisplayName(profile, user),
          totalXp: profile?.total_xp ?? 0,
          currentStreak: profile?.current_streak ?? 0,
        }}
      />
      <main className="lg:ml-64 min-h-screen">
        <div className="h-14 lg:hidden" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
