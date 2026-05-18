import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { isPdfBookFeatureEnabled, pdfBookFeatureDisabledJson } from "@/lib/features/feature-flags";
import { getPdfImportBatchDetail } from "@/lib/pdf-import/server";
import { isMissingDatabaseMigrationError } from "@/lib/supabase/schema-errors";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isPdfBookFeatureEnabled()) {
    return pdfBookFeatureDisabledJson();
  }

  try {
    await requireAdmin();
    const { batchId } = await context.params;
    const detail = await getPdfImportBatchDetail(batchId);
    return NextResponse.json(detail);
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    if (isMissingDatabaseMigrationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load PDF import status." },
      { status: 500 },
    );
  }
}
