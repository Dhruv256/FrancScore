import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminPassagesPage() {
  const records = await listAdminResource("passages");
  return <AdminResourcePageClient resource="passages" initialRecords={records} />;
}
