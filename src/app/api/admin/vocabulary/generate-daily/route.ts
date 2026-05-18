import { NextResponse } from "next/server";
import { generateDailyVocabularyBatch } from "@/lib/ai/generate-daily-vocab";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { getDailyVocabReadiness } from "@/lib/features/feature-flags";
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

    const summary = await generateDailyVocabularyBatch({ userId: user.id });
    timer.step("generated_daily_vocabulary");
    timer.done({ inserted_count: summary.insertedCount });
    return NextResponse.json({
      ok: true,
      batch_id: summary.batchId,
      requested_count: summary.requestedCount,
      generated_count: summary.generatedCount,
      inserted_count: summary.insertedCount,
      duplicate_count: summary.skippedDuplicateCount,
      failed_count: summary.failedCount,
      preview: summary.insertedPreview,
      message: summary.message,
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
