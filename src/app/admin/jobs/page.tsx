import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { safeListJobsForAdmin } from "@/lib/jobs/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    job_type?: string;
  }>;
};

const statusOptions = ["all", "queued", "processing", "completed", "failed", "cancelled"];

export default async function AdminJobsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const status = params.status && params.status !== "all" ? params.status : null;
  const jobType = params.job_type?.trim() || null;
  const { jobs, error } = await safeListJobsForAdmin({
    status,
    jobType,
    limit: 75,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
        <Link href="/admin/jobs" className="btn btn-secondary">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Link>
      </div>

      {error ? <SetupWarning message={error} /> : null}

      <form className="card-soft grid gap-3 rounded-[1.5rem] p-4 md:grid-cols-[180px_1fr_auto]">
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="input"
          aria-label="Filter by job status"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All statuses" : option}
            </option>
          ))}
        </select>
        <input
          name="job_type"
          defaultValue={jobType ?? ""}
          className="input"
          placeholder="Filter job type"
          aria-label="Filter by job type"
        />
        <button type="submit" className="btn btn-primary">
          Apply filters
        </button>
      </form>

      <div className="overflow-hidden rounded-[2rem] border border-border-default bg-bg-secondary shadow-soft">
        <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr_0.7fr_1fr] gap-4 border-b border-border-default px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-text-muted">
          <span>Job</span>
          <span>Status</span>
          <span>Progress</span>
          <span>Created</span>
          <span>Step</span>
        </div>
        {!error && jobs.length === 0 ? (
          <div className="px-5 py-10 text-sm text-text-muted">
            No processing jobs yet. Admin actions like daily vocabulary
            generation will appear here.
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-sm text-text-muted">
            Jobs will appear here after the processing infrastructure migration
            has been applied.
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
                <details className="col-span-full rounded-2xl bg-bg-primary/50 p-3 text-xs text-text-muted">
                  <summary className="cursor-pointer font-bold text-text-secondary">
                    Details
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        input_json: safeJson(job.input_json),
                        result_json: safeJson(job.result_json),
                        error_message: job.error_message,
                        completed_at: job.completed_at,
                      },
                      null,
                      2,
                    )}
                  </pre>
                  <button type="button" className="btn btn-ghost btn-sm mt-3" disabled>
                    Retry failed job coming soon
                  </button>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SetupWarning({ message }: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-accent-amber/30 bg-accent-amber/10 p-4 text-sm text-accent-amber">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-black text-text-primary">Processing jobs setup needed</p>
          <p className="mt-1">{message}</p>
          <p className="mt-2">
            Apply the latest Supabase migrations, then redeploy if the schema cache
            still reports the table missing.
          </p>
        </div>
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

function safeJson(value: unknown) {
  if (value === null || value === undefined) {
    return {};
  }
  return value;
}
