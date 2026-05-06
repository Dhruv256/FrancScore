import { BookChapterCard } from "@/components/book/BookChapterCard";
import { BookEmptyState } from "@/components/book/BookEmptyState";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";
import { getBookChapters } from "@/lib/book/server";

export default async function BookChaptersPage() {
  const auth = await resolveAuthState();
  if (auth.status !== "ready") return null;

  const overview = await getBookChapters(auth.userId);
  if (!overview.source) return <BookEmptyState />;

  return (
    <div className="space-y-6">
      <div className="surface-editorial rounded-[2.5rem] border border-black/[0.06] p-6 shadow-[0_24px_80px_rgba(17,17,17,0.08)]">
        <p className="page-kicker">French All-in-One Book</p>
        <h1 className="mt-3 text-4xl font-black text-text-primary">Chapter library</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {overview.chapters.length} imported chapters and appendices, each loaded independently for fast study.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overview.chapters.map((chapter) => (
          <BookChapterCard key={chapter.id} chapter={chapter} />
        ))}
      </div>
    </div>
  );
}
