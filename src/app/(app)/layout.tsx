import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/motion/PageTransition";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell min-h-screen">
      <Sidebar />
      <main className="min-h-screen lg:ml-64">
        <div className="h-14 lg:hidden" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:p-10">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
