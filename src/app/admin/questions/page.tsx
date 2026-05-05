import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminQuestionsPage() {
  const records = await listAdminResource("questions");
  return <AdminResourcePageClient resource="questions" initialRecords={records} />;
}
