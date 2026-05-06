import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getProfileDisplayName } from "@/lib/auth";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authState = await resolveAuthState();

  if (authState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (authState.status !== "ready") {
    redirect("/onboarding");
  }

  return (
    <div className="app-shell min-h-screen">
      <Sidebar
        userSummary={{
          fullName: getProfileDisplayName(authState.profile, authState.user),
          totalXp: authState.profile.total_xp,
          currentStreak: authState.profile.current_streak,
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
