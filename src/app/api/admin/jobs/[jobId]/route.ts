import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { getProcessingJob } from "@/lib/jobs/server";
import { isMissingDatabaseMigrationError } from "@/lib/supabase/schema-errors";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { user } = await requireAdmin();
    const { jobId } = await context.params;
    const job = await getProcessingJob(jobId, user.id, true);
    return NextResponse.json({ job });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    if (isMissingDatabaseMigrationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load job." },
      { status: 404 },
    );
  }
}
