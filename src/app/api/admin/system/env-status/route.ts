import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { getServerEnv } from "@/lib/env/server";
import { getDailyVocabReadiness } from "@/lib/features/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";

const BOOK_TABLES = [
  "book_sources",
  "book_chapters",
  "book_pages",
  "book_chunks",
  "book_notes",
  "book_generated_items",
  "user_book_progress",
  "user_book_answers",
  "book_import_reports",
] as const;

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }
    throw error;
  }

  try {
    const env = getServerEnv();
    const dailyVocab = getDailyVocabReadiness();
    const [storageReady, tablesReady] = await Promise.all([
      checkStorageBucket(env.SUPABASE_PDF_IMPORTS_BUCKET),
      checkTables([...BOOK_TABLES]),
    ]);

    return NextResponse.json({
      ok: true,
      features: {
        daily_vocab_generation: {
          enabled_flag: env.AI_VOCAB_GENERATION_ENABLED,
          has_nvidia_main_key: Boolean(env.NVIDIA_MAIN_API_KEY),
          model: env.NVIDIA_MAIN_MODEL,
          base_url_configured: Boolean(env.NVIDIA_API_BASE_URL),
          ready: dailyVocab.enabled,
          message: dailyVocab.message,
        },
        pdf_book: {
          enabled_flag: env.PDF_BOOK_FEATURE_ENABLED,
          storage_ready: storageReady,
          tables_ready: tablesReady,
          ready: env.PDF_BOOK_FEATURE_ENABLED && storageReady && tablesReady,
          storage_bucket: env.SUPABASE_PDF_IMPORTS_BUCKET,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to read environment status.",
      },
      { status: 500 },
    );
  }
}

async function checkStorageBucket(bucketName: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.getBucket(bucketName);
  return !error;
}

async function checkTables(tables: string[]) {
  const supabase = createAdminClient();
  const results = await Promise.all(
    tables.map((table) => supabase.from(table).select("id", { head: true, count: "exact" }).limit(1)),
  );
  return results.every((result) => !result.error);
}
