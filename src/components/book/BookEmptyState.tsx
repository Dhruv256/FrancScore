import { BookOpen } from "lucide-react";

export function BookEmptyState() {
  return (
    <div className="surface-panel rounded-[2.25rem] p-8 text-center shadow-[0_24px_70px_rgba(17,17,17,0.08)] sm:p-12">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[1.4rem] bg-brand-green/15 text-brand-green">
        <BookOpen className="h-8 w-8" />
      </div>
      <p className="page-kicker justify-center">Internal book module</p>
      <h1 className="mt-3 text-3xl font-black text-text-primary">
        No book imported yet.
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        The book import workflow is disabled while it is rebuilt. The PDF will be imported again from scratch when the module is ready.
      </p>
    </div>
  );
}
