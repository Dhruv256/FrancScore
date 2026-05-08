import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { GenerateDailyVocabButton } from "@/components/admin/GenerateDailyVocabButton";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminVocabularyPage() {
  const records = await listAdminResource("vocabulary");
  return (
    <div className="space-y-6">
      <GenerateDailyVocabButton />
      <AdminResourcePageClient resource="vocabulary" initialRecords={records} />
    </div>
  );
}
