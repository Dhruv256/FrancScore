import { listProcessingJobs } from "@/lib/jobs/server";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const jobs = await listProcessingJobs(75);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-green">
          System jobs
        </p>
        <h1 className="mt-2 text-3xl font-black text-text-primary">
          Jobs & Logs
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Monitor AI generation, import, PDF processing, and other long-running
          admin work without exposing private logs or secrets.
        </p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-border-default bg-bg-secondary shadow-soft">
        <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr_0.7fr_1fr] gap-4 border-b border-border-default px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-text-muted">
          <span>Job</span>
          <span>Status</span>
          <span>Progress</span>
          <span>Created</span>
          <span>Step</span>
        </div>
        {jobs.length === 0 ? (
          <div className="px-5 py-10 text-sm text-text-muted">
            No processing jobs yet. Admin actions like daily vocabulary
            generation will appear here.
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="grid grid-cols-[1.1fr_0.8fr_0.7fr_0.7fr_1fr] gap-4 px-5 py-4 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold text-text-primary">
                    {job.job_type}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    {job.id}
                  </div>
                </div>
                <span className="h-fit rounded-full bg-bg-tertiary px-3 py-1 text-xs font-black uppercase text-text-secondary">
                  {job.status}
                </span>
                <span className="font-bold text-text-primary">
                  {job.progress ?? 0}%
                </span>
                <span className="text-xs text-text-muted">
                  {formatDate(job.created_at)}
                </span>
                <span className="text-sm text-text-secondary">
                  {job.error_message ?? job.current_step ?? "Queued"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
