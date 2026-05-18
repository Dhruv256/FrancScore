import { FileSpreadsheet } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

type ImportBatch = {
  id: string;
  file_name: string | null;
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  concept_count: number;
  duplicate_count: number;
  ai_cleaned_count: number;
  status: string;
  error_message: string | null;
  created_at: string;
};

type ImportRow = {
  id: string;
  row_number: number;
  detected_type: string | null;
  action_taken: string;
  reason: string | null;
  confidence: number | null;
  normalized_json: unknown;
};

export default async function AdminVocabularyImportPage() {
  const { latestBatch, rows } = await getLatestImportPreview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
          <FileSpreadsheet className="h-6 w-6 text-accent-rose" />
          Vocabulary Import Preview
        </h1>
        <p className="text-sm text-text-secondary">
          Review the smart Excel cleanup pipeline: imported flashcards, skipped headings, grammar concepts, duplicates, and rows needing review.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-black">Import status</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Use this page to review smart Excel cleanup results. The upload workflow will be brought into the app UI; script commands stay out of product cards.
        </p>
      </div>

      {latestBatch ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <Metric label="Rows" value={latestBatch.total_rows} />
            <Metric label="Imported" value={latestBatch.imported_count} />
            <Metric label="Skipped" value={latestBatch.skipped_count} />
            <Metric label="Concepts" value={latestBatch.concept_count} />
            <Metric label="Duplicates" value={latestBatch.duplicate_count} />
            <Metric label="AI cleaned" value={latestBatch.ai_cleaned_count} />
          </div>

          <div className="card overflow-hidden p-0">
            <div className="border-b border-border-default p-4">
              <div className="font-black">Latest batch: {latestBatch.file_name ?? "Excel import"}</div>
              <div className="text-xs text-text-muted">
                {latestBatch.status} · {new Date(latestBatch.created_at).toLocaleString()}
              </div>
              {latestBatch.error_message ? (
                <p className="mt-2 text-sm text-accent-rose">{latestBatch.error_message}</p>
              ) : null}
            </div>
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-bg-secondary text-xs uppercase tracking-[0.14em] text-text-muted">
                  <tr>
                    <th className="p-3">Row</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Confidence</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border-default">
                      <td className="p-3 font-bold">{row.row_number}</td>
                      <td className="p-3">{row.detected_type ?? "unknown"}</td>
                      <td className="p-3">
                        <span className="badge bg-brand-green/10 text-brand-green">{row.action_taken}</span>
                      </td>
                      <td className="p-3">{Math.round((row.confidence ?? 0) * 100)}%</td>
                      <td className="max-w-xl p-3 text-text-secondary">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-5 text-sm text-text-secondary">
          No import batch has been recorded yet. Use Admin Vocabulary for daily AI generation, or return here after an Excel import batch exists.
        </div>
      )}
    </div>
  );
}

async function getLatestImportPreview() {
  // New import tables are additive and may not be in generated types yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { data: latestBatch } = await supabase
    .from("vocabulary_import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestBatch) {
    return { latestBatch: null, rows: [] as ImportRow[] };
  }

  const { data: rows } = await supabase
    .from("vocabulary_import_rows")
    .select("*")
    .eq("batch_id", latestBatch.id)
    .order("row_number", { ascending: true })
    .limit(250);

  return {
    latestBatch: latestBatch as ImportBatch,
    rows: (rows ?? []) as ImportRow[],
  };
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
