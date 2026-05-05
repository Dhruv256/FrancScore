import { AdminResourcePageClient } from "@/components/admin/AdminResourcePageClient";
import { listAdminResource } from "@/lib/admin/server";

export default async function AdminMocksPage() {
  const records = await listAdminResource("mock-tests");
  return <AdminResourcePageClient resource="mock-tests" initialRecords={records} />;
}
