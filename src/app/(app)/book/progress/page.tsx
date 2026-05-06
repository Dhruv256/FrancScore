import { BarChart3 } from "lucide-react";
import { BookEmptyState } from "@/components/book/BookEmptyState";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";
import { getBookOverview } from "@/lib/book/server";

export default async function BookProgressPage() {
  const auth = await resolveAuthState();
  if (auth.status !== "ready") return null;

  const overview = await getBookOverview(auth.userId);
  if (!overview.source) return <BookEmptyState />;

  return (
    <div className="space-y-6">
      <div className="surface-editorial rounded-[2.5rem] border border-black/[0.06] p-6 shadow-[0_24px_80px_rgba(17,17,17,0.08)]">
        <p className="page-kicker">
          <BarChart3 className="h-4 w-4" />
          Book progress
        </p>
        <h1 className="mt-3 text-4xl font-black text-text-primary">Progress dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Chapters" value={`${overview.stats.chaptersCompleted}/${overview.stats.chaptersTotal}`} />
        <Metric label="Pages imported" value={overview.stats.pagesTotal} />
        <Metric label="Flashcards" value={overview.stats.flashcards} />
        <Metric label="Practice items" value={overview.stats.generatedItems} />
      </div>

      <div className="rounded-[2rem] border border-black/[0.07] bg-[#fffaf0] p-5">
        <h2 className="text-xl font-black text-text-primary">Chapter completion</h2>
        <div className="mt-5 space-y-3">
          {overview.chapters.map((chapter) => {
            const progress = chapter.progress?.completion_percent ?? 0;
            return (
              <div key={chapter.id}>
                <div className="mb-1 flex justify-between text-xs font-bold text-text-secondary">
                  <span>{chapter.title}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/10">
                  <div className="h-2 rounded-full bg-brand-green" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[2rem] bg-[#111111] p-5 text-[#F7F2E8] shadow-[0_20px_60px_rgba(17,17,17,0.2)]">
      <div className="text-3xl font-black text-brand-green">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#A8A096]">{label}</div>
    </div>
  );
}
