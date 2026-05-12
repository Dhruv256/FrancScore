import "server-only";

import { generateDailyVocabularyBatch } from "@/lib/ai/generate-daily-vocab";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

type JobRow = Database["public"]["Tables"]["processing_jobs"]["Row"];
type JobInsert = Database["public"]["Tables"]["processing_jobs"]["Insert"];

export async function createProcessingJob(input: {
  userId?: string | null;
  jobType: string;
  inputJson?: Json;
  totalSteps?: number | null;
  currentStep?: string | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("processing_jobs")
    .insert({
      user_id: input.userId ?? null,
      job_type: input.jobType,
      input_json: input.inputJson ?? {},
      total_steps: input.totalSteps ?? null,
      current_step: input.currentStep ?? "Queued",
      status: "queued",
      progress: 0,
    } satisfies JobInsert)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create processing job.");
  }

  return data;
}

export async function getProcessingJob(jobId: string, userId?: string | null, isAdmin = false) {
  const supabase = createAdminClient();
  let query = supabase.from("processing_jobs").select("*").eq("id", jobId);
  if (!isAdmin && userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.single();
  if (error || !data) {
    throw new Error(error?.message ?? "Processing job not found.");
  }
  return data;
}

export async function listProcessingJobs(limit = 50) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function processNextJobStep(jobId: string) {
  const supabase = createAdminClient();
  const { data: job, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    throw new Error(error?.message ?? "Processing job not found.");
  }

  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return job;
  }

  switch (job.job_type) {
    case "daily_vocab_generation":
      return processDailyVocabJob(job);
    default:
      throw new Error(`Unsupported job type: ${job.job_type}`);
  }
}

async function processDailyVocabJob(job: JobRow) {
  const supabase = createAdminClient();
  await supabase
    .from("processing_jobs")
    .update({
      status: "processing",
      progress: 5,
      current_step: "Generating and validating vocabulary",
      started_at: job.started_at ?? new Date().toISOString(),
      error_message: null,
    })
    .eq("id", job.id);

  try {
    const summary = await generateDailyVocabularyBatch({
      onProgress: async (progress, currentStep) => {
        await supabase
          .from("processing_jobs")
          .update({ progress, current_step: currentStep })
          .eq("id", job.id);
      },
    });

    const { data: updated, error } = await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        progress: 100,
        current_step: "Completed",
        result_json: summary as unknown as Json,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();

    if (error || !updated) throw new Error(error?.message ?? "Unable to finish job.");
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed.";
    const { data: failed } = await supabase
      .from("processing_jobs")
      .update({
        status: "failed",
        progress: 100,
        current_step: "Failed",
        error_message: message.slice(0, 1000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();
    if (failed) return failed;
    throw error;
  }
}
