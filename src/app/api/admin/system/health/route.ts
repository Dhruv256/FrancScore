import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/schema-errors";

type HealthCheck = {
  name: string;
  status: "ok" | "warning" | "error";
  message?: string;
};

const REQUIRED_TABLES = [
  "processing_jobs",
  "daily_vocab_generations",
  "pdf_import_batches",
  "pdf_import_chunks",
  "pdf_import_items",
];

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

  const checks: HealthCheck[] = [];

  try {
    const env = getServerEnv();
    checks.push({
      name: "nvidia_env",
      status: env.NVIDIA_API_KEY || env.NVIDIA_MAIN_API_KEY ? "ok" : "warning",
      message:
        env.NVIDIA_API_KEY || env.NVIDIA_MAIN_API_KEY
          ? "NVIDIA API key configured."
          : "NVIDIA API key is missing; AI generation will fail.",
    });
    checks.push({
      name: "pdf_env",
      status: env.PDF_PROCESSING_ENABLED ? "ok" : "warning",
      message: env.PDF_PROCESSING_ENABLED
        ? "PDF processing enabled."
        : "PDF processing disabled.",
    });
    await checkStorageBucket(checks, env.SUPABASE_PDF_IMPORTS_BUCKET);
  } catch (error) {
    checks.push({
      name: "server_env",
      status: "error",
      message: error instanceof Error ? error.message : "Server env validation failed.",
    });
  }

  for (const table of REQUIRED_TABLES) {
    checks.push(await checkTable(table));
  }

  return NextResponse.json({
    ok: checks.every((check) => check.status !== "error"),
    checks,
  });
}

async function checkTable(table: string): Promise<HealthCheck> {
  const supabase = createAdminClient();
  const { error } = await supabase.from(table).select("id", { count: "exact", head: true }).limit(1);

  if (!error) {
    return { name: table, status: "ok" };
  }

  return {
    name: table,
    status: isMissingTableError(error, table) ? "error" : "warning",
    message: isMissingTableError(error, table)
      ? `Missing table: public.${table}. Apply the latest Supabase migrations.`
      : error.message,
  };
}

async function checkStorageBucket(checks: HealthCheck[], bucketName: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.getBucket(bucketName);
  checks.push({
    name: "pdf_storage_bucket",
    status: error ? "warning" : "ok",
    message: error
      ? `Storage bucket "${bucketName}" could not be found or read.`
      : `Storage bucket "${bucketName}" is available.`,
  });
}
