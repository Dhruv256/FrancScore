import Link from "next/link";
import { ArrowRight, BookOpen, Layers, ListChecks, NotebookTabs } from "lucide-react";
import type { BookChapter } from "@/lib/book/types";

export function BookChapterCard({ chapter }: { chapter: BookChapter }) {
  const progress = chapter.progress?.completion_percent ?? 0;
  const pageRange =
    chapter.start_page && chapter.end_page
      ? `Pages ${chapter.start_page}-${chapter.end_page}`
      : "Page range pending";

  return (
    <article className="card-soft group rounded-[2rem] border border-black/[0.07] bg-[#fffaf0]/80 p-5 shadow-[0_18px_55px_rgba(17,17,17,0.07)] transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-green">
            {chapter.section_type === "appendix"
              ? "Appendix"
              : `Chapter ${chapter.chapter_number ?? chapter.order_index}`}
          </p>
          <h2 className="mt-2 text-lg font-black leading-tight text-text-primary">
            {chapter.title}
          </h2>
          <p className="mt-2 text-xs text-text-secondary">{pageRange}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#111111] text-[#F7F2E8] shadow-[0_16px_35px_rgba(17,17,17,0.2)]">
          <BookOpen className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(chapter.skill_focus ?? ["grammar"]).slice(0, 4).map((skill) => (
          <span key={`${chapter.id}-${skill}`} className="badge bg-[#DDE5E1] text-[#27241F]">
            {skill}
          </span>
        ))}
        <span className="badge border-brand-green/25 bg-brand-green/10 text-brand-green">
          {chapter.cefr_level ?? "B1"}
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-text-secondary">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-black/10">
          <div className="h-2 rounded-full bg-brand-green" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-black sm:grid-cols-4">
        <Link href={`/book/chapters/${chapter.id}`} className="rounded-2xl bg-[#111111] px-3 py-2 text-center text-[#F7F2E8]">
          Study
        </Link>
        <Link href={`/book/chapters/${chapter.id}/notes`} className="rounded-2xl bg-black/[0.06] px-3 py-2 text-center text-text-primary">
          <NotebookTabs className="mr-1 inline h-3.5 w-3.5" />
          Notes
        </Link>
        <Link href={`/book/chapters/${chapter.id}/practice`} className="rounded-2xl bg-black/[0.06] px-3 py-2 text-center text-text-primary">
          <ListChecks className="mr-1 inline h-3.5 w-3.5" />
          Practice
        </Link>
        <Link href={`/book/chapters/${chapter.id}/flashcards`} className="rounded-2xl bg-brand-green px-3 py-2 text-center text-[#111111]">
          <Layers className="mr-1 inline h-3.5 w-3.5" />
          Cards
        </Link>
      </div>

      <Link
        href={`/book/chapters/${chapter.id}/quiz`}
        className="mt-3 inline-flex items-center gap-2 text-xs font-black text-brand-green"
      >
        Open chapter quiz <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
