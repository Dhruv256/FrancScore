import Link from "next/link";
import { Search } from "lucide-react";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";
import { searchBook } from "@/lib/book/server";

export default async function BookSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const auth = await resolveAuthState();
  if (auth.status !== "ready") return null;

  const { q = "" } = await searchParams;
  const results = await searchBook(q);

  return (
    <div className="space-y-6">
      <div className="surface-editorial rounded-[2.5rem] border border-black/[0.06] p-6 shadow-[0_24px_80px_rgba(17,17,17,0.08)]">
        <p className="page-kicker">
          <Search className="h-4 w-4" />
          Private book search
        </p>
        <h1 className="mt-3 text-4xl font-black text-text-primary">Search inside the book</h1>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            defaultValue={q}
            className="input flex-1"
            placeholder="Search grammar, vocabulary, or chapter text..."
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
      </div>

      {!q ? (
        <div className="card-soft rounded-[2rem] p-6 text-sm text-text-secondary">
          Enter a term to search imported book chunks. Results open the relevant chapter/page range.
        </div>
      ) : results.length ? (
        <div className="grid gap-3">
          {results.map((result) => (
            <Link
              key={result.id}
              href={result.chapter_id ? `/book/chapters/${result.chapter_id}` : "/book"}
              className="rounded-[2rem] border border-black/[0.07] bg-[#fffaf0] p-5 shadow-[0_18px_55px_rgba(17,17,17,0.07)]"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-green">
                {result.chapter_title ?? "Book chunk"} · pages {result.page_start ?? "?"}-{result.page_end ?? "?"}
              </p>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{result.snippet}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card-soft rounded-[2rem] p-6 text-sm text-text-secondary">
          No imported book chunks matched “{q}”.
        </div>
      )}
    </div>
  );
}
