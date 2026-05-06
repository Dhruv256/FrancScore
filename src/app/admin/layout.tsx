import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
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

  if (authState.profile.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
