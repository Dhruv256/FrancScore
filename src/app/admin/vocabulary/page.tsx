import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminVocabularyPage() {
  const records = await listAdminResource("vocabulary");
  return <AdminResourcePageClient resource="vocabulary" initialRecords={records} />;
}
