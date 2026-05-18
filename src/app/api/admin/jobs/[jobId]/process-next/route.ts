import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { processNextJobStep } from "@/lib/jobs/server";
import { createRouteTimer } from "@/lib/observability/timing";
import { isMissingDatabaseMigrationError } from "@/lib/supabase/schema-errors";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const timer = createRouteTimer("POST /api/admin/jobs/[jobId]/process-next");

  try {
    await requireAdmin();
    const { jobId } = await context.params;
    const job = await processNextJobStep(jobId);
    timer.step("processed_step");
    timer.done({ job_id: job.id, status: job.status });
    return NextResponse.json({ job });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    if (isMissingDatabaseMigrationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    timer.done({ failed: true });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process job." },
      { status: 500 },
    );
  }
}
