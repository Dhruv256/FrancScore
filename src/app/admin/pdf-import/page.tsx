import { PdfImportClient } from "@/components/admin/PdfImportClient";
import { getServerEnv } from "@/lib/env/server";
import { listPdfImportBatches } from "@/lib/pdf-import/server";

export const dynamic = "force-dynamic";

export default async function AdminPdfImportPage() {
  const [batches, env] = await Promise.all([listPdfImportBatches(), Promise.resolve(getServerEnv())]);

  return (
    <PdfImportClient
      batches={batches}
      enabled={env.PDF_PROCESSING_ENABLED}
    />
  );
}
