import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import type { GenerationBatchHistory } from "@/components/admin/GenerateDailyVocabButton";
import { GenerateDailyVocabButton } from "@/components/admin/GenerateDailyVocabButton";
import { listAdminResource } from "@/lib/admin/server";
import { getDailyVocabReadiness } from "@/lib/features/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/schema-errors";

export default async function AdminVocabularyPage() {
  const [records, history] = await Promise.all([
    listAdminResource("vocabulary"),
    getVocabularyGenerationHistory(),
  ]);
  const readiness = getDailyVocabReadiness();

  return (
    <div className="space-y-6">
      <GenerateDailyVocabButton
        enabled={readiness.enabled}
        disabledReason={readiness.enabled ? null : readiness.message}
        requestedCount={readiness.requestedCount}
        latestBatches={history}
      />
      <AdminResourcePageClient resource="vocabulary" initialRecords={records} />
    </div>
  );
}

async function getVocabularyGenerationHistory(): Promise<GenerationBatchHistory[]> {
  try {
    // Database types are intentionally stale until Supabase typegen is rerun.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;
    const { data, error } = await supabase
      .from("vocabulary_generation_batches")
      .select(
        "id,created_at,requested_count,generated_count,inserted_count,duplicate_count,failed_count,model,status,error_message,vocabulary_generation_items(french_word,status)",
      )
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      if (isMissingTableError(error, "vocabulary_generation_batches")) {
        return [];
      }
      throw new Error(error.message);
    }

    return (data ?? []).map((batch: Record<string, unknown>) => ({
      id: String(batch.id),
      created_at: String(batch.created_at),
      requested_count: Number(batch.requested_count ?? 0),
      generated_count: Number(batch.generated_count ?? 0),
      inserted_count: Number(batch.inserted_count ?? 0),
      duplicate_count: Number(batch.duplicate_count ?? 0),
      failed_count: Number(batch.failed_count ?? 0),
      model: typeof batch.model === "string" ? batch.model : null,
      status: String(batch.status ?? "unknown"),
      error_message: typeof batch.error_message === "string" ? batch.error_message : null,
      preview: Array.isArray(batch.vocabulary_generation_items)
        ? batch.vocabulary_generation_items
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
            .slice(0, 8)
            .map((item) => ({
              french_word: String(item.french_word ?? ""),
              status: String(item.status ?? ""),
            }))
        : [],
    }));
  } catch {
    return [];
  }
}
