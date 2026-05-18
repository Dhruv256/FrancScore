import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { isPdfBookFeatureEnabled, pdfBookFeatureDisabledJson } from "@/lib/features/feature-flags";
import { processNextPdfImportChunk } from "@/lib/pdf-import/server";
import { isMissingDatabaseMigrationError } from "@/lib/supabase/schema-errors";

export async function POST(request: Request) {
  if (!isPdfBookFeatureEnabled()) {
    return pdfBookFeatureDisabledJson();
  }

  try {
    await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as {
      batchId?: string;
      chunkId?: string;
    };

    if (!body.batchId) {
      return NextResponse.json(
        {
          ok: false,
          code: "PDF_IMPORT_BATCH_REQUIRED",
          message: "batchId is required to process PDF chunks.",
        },
        { status: 400 },
      );
    }

    const result = await processNextPdfImportChunk(body.batchId, body.chunkId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    if (isMissingDatabaseMigrationError(error)) {
      return NextResponse.json(
        {
          ok: false,
          code: "DATABASE_MIGRATION_MISSING",
          message: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "PDF_IMPORT_PROCESS_FAILED",
        message: error instanceof Error ? error.message : "Unable to process PDF import.",
      },
      { status: 500 },
    );
  }
}
