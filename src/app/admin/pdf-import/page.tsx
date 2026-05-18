import { PdfImportClient } from "@/components/admin/PdfImportClient";
import { FeatureDisabled } from "@/components/FeatureDisabled";
import { getServerEnv } from "@/lib/env/server";
import { isPdfBookFeatureEnabled } from "@/lib/features";
import { safeListPdfImportBatches } from "@/lib/pdf-import/server";

export const dynamic = "force-dynamic";

export default async function AdminPdfImportPage() {
  if (!isPdfBookFeatureEnabled()) {
    return (
      <FeatureDisabled
        href="/admin"
        cta="Return to admin"
        title="PDF Book Import is temporarily disabled"
        description="This import workflow will be rebuilt and the book will be imported again from scratch later."
      />
    );
  }

  const [{ batches, error }, envResult] = await Promise.all([
    safeListPdfImportBatches(),
    Promise.resolve(readPdfEnvState()),
  ]);

  return (
    <PdfImportClient
      batches={batches}
      enabled={envResult.enabled}
      setupWarnings={[
        ...(error ? [error] : []),
        ...envResult.warnings,
      ]}
    />
  );
}

function readPdfEnvState() {
  try {
    const env = getServerEnv();
    const warnings: string[] = [];

    if (!env.PDF_PROCESSING_ENABLED) {
      warnings.push("AI chunk processing is disabled. Upload and text extraction can run, but set PDF_PROCESSING_ENABLED=true before processing chunks with AI.");
    }

    if (!env.NVIDIA_API_KEY && !env.NVIDIA_MAIN_API_KEY) {
      warnings.push("NVIDIA API key is not configured. AI chunk processing will not run.");
    }

    if (!env.NVIDIA_PDF_PROCESSING_MODEL && !env.NVIDIA_MAIN_MODEL) {
      warnings.push("NVIDIA PDF processing model is not configured.");
    }

    return { enabled: true, warnings };
  } catch (error) {
    return {
      enabled: false,
      warnings: [
        error instanceof Error
          ? error.message
          : "Server environment could not be validated.",
      ],
    };
  }
}
