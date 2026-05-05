import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminBadgesPage() {
  const records = await listAdminResource("badges");
  return <AdminResourcePageClient resource="badges" initialRecords={records} />;
}
