import { FeatureDisabled } from "@/components/FeatureDisabled";
import { isPdfBookFeatureEnabled } from "@/lib/features";
import { BookOpen, FileText, Headphones, Layers, NotebookTabs } from "lucide-react";
import { getBookAdminStatus } from "@/lib/book/server";

export default async function AdminBookPage() {
  if (!isPdfBookFeatureEnabled()) {
    return (
      <FeatureDisabled
        href="/admin"
        cta="Return to admin"
        title="French All-in-One Book is temporarily disabled"
        description="The imported book data is being cleared and this module will be rebuilt before the next import."
      />
    );
  }

  const status = await getBookAdminStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="h-6 w-6 text-accent-rose" />
          French All-in-One Book
        </h1>
        <p className="text-sm text-text-secondary">
          Internal PDF import status, chapter detection, generated notes, practice items, and audio readiness.
        </p>
      </div>

      {!status.source ? (
        <div className="card p-5">
          <h2 className="text-lg font-black">No book imported yet.</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Book import is not available in the product UI yet. This module will be rebuilt before the next import.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric label="Chapters" value={status.chapters} icon={BookOpen} />
            <Metric label="Pages" value={status.pages} icon={FileText} />
            <Metric label="Chunks" value={status.chunks} icon={Layers} />
            <Metric label="Notes" value={status.notes} icon={NotebookTabs} />
            <Metric label="Generated items" value={status.generatedItems} icon={Layers} />
            <Metric label="Missing audio" value={status.listeningScriptsMissingAudio} icon={Headphones} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-base font-semibold">Latest import report</h2>
            <pre className="max-h-80 overflow-auto rounded-2xl bg-bg-input p-4 text-xs text-text-secondary">
              {JSON.stringify(getReportJson(status.latestReport), null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}

function getReportJson(report: unknown) {
  return report && typeof report === "object" && "report_json" in report
    ? (report as { report_json: unknown }).report_json
    : {};
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-green/25 bg-brand-green/10">
          <Icon className="h-5 w-5 text-brand-green" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}
