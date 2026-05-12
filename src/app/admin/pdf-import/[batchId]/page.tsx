import { notFound } from "next/navigation";
import { PdfImportReviewClient } from "@/components/admin/PdfImportReviewClient";
import { getPdfImportBatchDetail } from "@/lib/pdf-import/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function AdminPdfImportReviewPage({ params }: PageProps) {
  const { batchId } = await params;
  let detail: Awaited<ReturnType<typeof getPdfImportBatchDetail>>;

  try {
    detail = await getPdfImportBatchDetail(batchId);
  } catch {
    notFound();
  }

  return (
    <PdfImportReviewClient
      batch={detail.batch}
      chunks={detail.chunks}
      items={detail.items}
    />
  );
}
