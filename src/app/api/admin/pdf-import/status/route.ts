import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { isPdfBookFeatureEnabled, pdfBookFeatureDisabledJson } from "@/lib/features/feature-flags";
import { getPdfImportStatus } from "@/lib/pdf-import/server";
import { isMissingDatabaseMigrationError } from "@/lib/supabase/schema-errors";

export async function GET() {
  if (!isPdfBookFeatureEnabled()) {
    return pdfBookFeatureDisabledJson();
  }

  try {
    await requireAdmin();
    const status = await getPdfImportStatus();
    return NextResponse.json({ ok: true, ...status });
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
        code: "PDF_IMPORT_STATUS_FAILED",
        message: error instanceof Error ? error.message : "Unable to load PDF import status.",
      },
      { status: 500 },
    );
  }
}
