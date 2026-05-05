import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminSpeakingPage() {
  const records = await listAdminResource("speaking-prompts");
  return <AdminResourcePageClient resource="speaking-prompts" initialRecords={records} />;
}
