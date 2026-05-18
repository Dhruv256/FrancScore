import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { getDailyVocabReadiness } from "@/lib/features/feature-flags";
import { createProcessingJob } from "@/lib/jobs/server";
import { createRouteTimer } from "@/lib/observability/timing";
import { isMissingDatabaseMigrationError } from "@/lib/supabase/schema-errors";

export async function POST() {
  const timer = createRouteTimer("POST /api/admin/vocabulary/generate-daily");
  try {
    const { user } = await requireAdmin();
    const readiness = getDailyVocabReadiness();

    if (!readiness.enabled) {
      timer.done({ blocked: readiness.code });
      return NextResponse.json(
        {
          ok: false,
          code: readiness.code,
          message: readiness.message,
        },
        { status: 400 },
      );
    }

    const job = await createProcessingJob({
      userId: user.id,
      jobType: "daily_vocab_generation",
      inputJson: {
        requested_count: readiness.requestedCount,
        generation_date: new Date().toISOString().slice(0, 10),
      },
      totalSteps: 1,
      currentStep: "Queued daily vocabulary generation",
    });
    timer.step("job_created");
    timer.done({ job_id: job.id });
    return NextResponse.json({
      ok: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
    });
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

    timer.done({ failed: true });
    return NextResponse.json(
      {
        ok: false,
        code: "DAILY_VOCAB_GENERATION_QUEUE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Daily vocabulary generation failed.",
      },
      { status: 500 },
    );
  }
}
