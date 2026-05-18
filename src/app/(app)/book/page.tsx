import Link from "next/link";
import { BookOpen, Library, Search, Sparkles } from "lucide-react";
import { BookChapterCard } from "@/components/book/BookChapterCard";
import { BookEmptyState } from "@/components/book/BookEmptyState";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";
import { getBookOverview } from "@/lib/book/server";

export default async function BookDashboardPage() {
  const auth = await resolveAuthState();
  if (auth.status !== "ready") return null;

  const overview = await getBookOverview(auth.userId);
  if (!overview.source) return <BookEmptyState />;

  const continueChapter =
    overview.chapters.find((chapter) => (chapter.progress?.completion_percent ?? 0) < 100) ??
    overview.chapters[0];

  return (
    <div className="space-y-7">
      <section className="surface-editorial overflow-hidden rounded-[2.75rem] border border-black/[0.06] p-6 shadow-[0_28px_90px_rgba(17,17,17,0.09)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="page-kicker">
              <Library className="h-4 w-4" />
              Internal digital course
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.95] text-text-primary sm:text-6xl">
              French All-in-One Book
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
              Study the imported private PDF chapter-by-chapter with notes, extracted pages,
              flashcards, practice, quiz material, search, and revision tracking.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {continueChapter && (
                <Link href={`/book/chapters/${continueChapter.id}`} className="btn btn-primary">
                  Continue studying
                </Link>
              )}
              <Link href="/book/search" className="btn btn-secondary">
                <Search className="h-4 w-4" />
                Search book
              </Link>
            </div>
          </div>
          <div className="rounded-[2.5rem] bg-[#111111] p-5 text-[#F7F2E8] shadow-[0_26px_80px_rgba(17,17,17,0.25)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#A8A096]">Course progress</p>
                <p className="text-4xl font-black">{overview.stats.chaptersCompleted}/{overview.stats.chaptersTotal}</p>
              </div>
              <Sparkles className="h-8 w-8 text-brand-green" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Pages" value={overview.stats.pagesTotal} />
              <Metric label="Notes" value={overview.stats.notesGenerated} />
              <Metric label="Flashcards" value={overview.stats.flashcards} />
              <Metric label="Quiz items" value={overview.stats.quizItems} />
            </div>
          </div>
        </div>
      </section>

      {overview.stats.generatedItems === 0 && (
        <div className="rounded-[2rem] border border-brand-green/20 bg-brand-green/10 p-5 text-sm text-text-secondary">
          Learning material has not been generated yet. This module will be rebuilt before the next book import.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="page-kicker">
            <BookOpen className="h-4 w-4" />
            Chapter map
          </p>
          <h2 className="mt-2 text-2xl font-black text-text-primary">Start with a focused chapter</h2>
        </div>
        <Link href="/book/chapters" className="text-sm font-black text-brand-green">
          View all
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overview.chapters.slice(0, 6).map((chapter) => (
          <BookChapterCard key={chapter.id} chapter={chapter} />
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <div className="text-2xl font-black text-brand-green">{value}</div>
      <div className="text-xs text-[#A8A096]">{label}</div>
    </div>
  );
}
