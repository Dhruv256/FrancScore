import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { BookChapterCard } from "@/components/book/BookChapterCard";
import { BookEmptyState } from "@/components/book/BookEmptyState";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";
import { getBookOverview } from "@/lib/book/server";

export default async function BookRevisionPage() {
  const auth = await resolveAuthState();
  if (auth.status !== "ready") return null;

  const overview = await getBookOverview(auth.userId);
  if (!overview.source) return <BookEmptyState />;

  const weakChapters = overview.chapters
    .filter((chapter) => (chapter.progress?.quiz_score ?? 100) < 70 || (chapter.progress?.completion_percent ?? 0) < 40)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="surface-editorial rounded-[2.5rem] border border-black/[0.06] p-6 shadow-[0_24px_80px_rgba(17,17,17,0.08)]">
        <p className="page-kicker">
          <RotateCcw className="h-4 w-4" />
          Revision plan
        </p>
        <h1 className="mt-3 text-4xl font-black text-text-primary">Book weak areas</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Review chapters with low completion or quiz scores. As you answer book quizzes, this page becomes more personalized.
        </p>
      </div>

      {weakChapters.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weakChapters.map((chapter) => (
            <BookChapterCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] bg-[#111111] p-6 text-[#F7F2E8]">
          <h2 className="text-2xl font-black">No weak chapters yet.</h2>
          <p className="mt-2 text-sm text-[#A8A096]">
            Start chapter quizzes and flashcards to create a real revision plan.
          </p>
          <Link href="/book/chapters" className="btn btn-primary mt-5">
            Study chapters
          </Link>
        </div>
      )}
    </div>
  );
}
