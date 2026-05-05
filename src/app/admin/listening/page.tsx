import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminListeningPage() {
  const records = await listAdminResource("listening");
  return <AdminResourcePageClient resource="listening" initialRecords={records} />;
}
