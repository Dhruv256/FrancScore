import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminMissionsPage() {
  const records = await listAdminResource("missions");
  return <AdminResourcePageClient resource="missions" initialRecords={records} />;
}
