import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { createProcessingJob } from "@/lib/jobs/server";
import { createRouteTimer } from "@/lib/observability/timing";

export async function POST() {
  const timer = createRouteTimer("POST /api/admin/vocabulary/generate-daily");
  try {
    const { user } = await requireAdmin();
    const job = await createProcessingJob({
      userId: user.id,
      jobType: "daily_vocab_generation",
      totalSteps: 1,
      currentStep: "Queued daily vocabulary generation",
    });
    timer.step("job_created");
    timer.done({ job_id: job.id });
    return NextResponse.json({ jobId: job.id, status: job.status, progress: job.progress });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    timer.done({ failed: true });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Daily vocabulary generation failed.",
      },
      { status: 500 },
    );
  }
}
