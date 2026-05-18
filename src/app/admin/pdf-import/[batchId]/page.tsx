import { notFound } from "next/navigation";
import { FeatureDisabled } from "@/components/FeatureDisabled";
import { PdfImportReviewClient } from "@/components/admin/PdfImportReviewClient";
import { isPdfBookFeatureEnabled } from "@/lib/features";
import { getPdfImportBatchDetail } from "@/lib/pdf-import/server";
import { isMissingDatabaseMigrationError } from "@/lib/supabase/schema-errors";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function AdminPdfImportReviewPage({ params }: PageProps) {
  if (!isPdfBookFeatureEnabled()) {
    return (
      <FeatureDisabled
        href="/admin"
        cta="Return to admin"
        title="PDF Book Import is temporarily disabled"
        description="Existing imported PDF data is being cleared. This workflow will return after it is stable."
      />
    );
  }

  const { batchId } = await params;
  let detail: Awaited<ReturnType<typeof getPdfImportBatchDetail>>;
  let setupError: string | null = null;

  try {
    detail = await getPdfImportBatchDetail(batchId);
  } catch (error) {
    if (isMissingDatabaseMigrationError(error)) {
      setupError = error.message;
      detail = {
        batch: {
          id: batchId,
          file_name: "PDF import unavailable",
          status: "failed",
          total_pages: 0,
          total_chunks: 0,
          chapters_detected: 0,
          model_used: null,
          error_message: error.message,
          storage_path: null,
          title: null,
          uploaded_by: null,
          created_at: new Date().toISOString(),
          completed_at: null,
          updated_at: new Date().toISOString(),
        },
        chunks: [],
        items: [],
      } as Awaited<ReturnType<typeof getPdfImportBatchDetail>>;
    } else {
      notFound();
    }
  }

  return (
    <PdfImportReviewClient
      batch={detail.batch}
      chunks={detail.chunks}
      items={detail.items}
      setupError={setupError}
    />
  );
}
