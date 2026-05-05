import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminWritingPage() {
  const records = await listAdminResource("writing-prompts");
  return <AdminResourcePageClient resource="writing-prompts" initialRecords={records} />;
}
