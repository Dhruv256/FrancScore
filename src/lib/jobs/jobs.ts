import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  MissingDatabaseMigrationError,
  toMissingMigrationError,
} from "@/lib/supabase/schema-errors";

export type ProcessingJob = Database["public"]["Tables"]["processing_jobs"]["Row"];
type ProcessingJobInsert = Database["public"]["Tables"]["processing_jobs"]["Insert"];
type ProcessingJobUpdate = Database["public"]["Tables"]["processing_jobs"]["Update"];

const JOBS_TABLE = "processing_jobs";

type CreateJobInput = {
  userId?: string | null;
  jobType: string;
  inputJson?: Json;
  totalSteps?: number | null;
  currentStep?: string | null;
};

type ListJobsInput = {
  status?: string | null;
  jobType?: string | null;
  limit?: number;
  offset?: number;
};

export async function createJob(input: CreateJobInput) {
  const supabase = createAdminClient();
  const payload = {
    user_id: input.userId ?? null,
    job_type: input.jobType,
    input_json: input.inputJson ?? {},
    total_steps: input.totalSteps ?? null,
    current_step: input.currentStep ?? "Queued",
    status: "queued",
    progress: 0,
    result_json: {},
  } satisfies ProcessingJobInsert;

  const { data, error } = await supabase
    .from(JOBS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throwJobError(error, "Unable to create processing job.");
  }

  return data;
}

export async function getJob(jobId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(JOBS_TABLE)
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    throwJobError(error, "Processing job not found.");
  }

  return data;
}

export async function getJobForUser(jobId: string, userId: string, isAdmin = false) {
  const supabase = createAdminClient();
  let query = supabase.from(JOBS_TABLE).select("*").eq("id", jobId);

  if (!isAdmin) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throwJobError(error, "Processing job not found.");
  }

  return data;
}

export async function updateJobProgress(
  jobId: string,
  input: {
    progress: number;
    currentStep: string;
    resultJson?: Json;
  },
) {
  const payload: ProcessingJobUpdate = {
    progress: clampProgress(input.progress),
    current_step: input.currentStep,
  };

  if (input.resultJson !== undefined) {
    payload.result_json = input.resultJson;
  }

  return updateJob(jobId, payload);
}

export async function markJobProcessing(jobId: string, currentStep = "Processing") {
  return updateJob(jobId, {
    status: "processing",
    current_step: currentStep,
    started_at: new Date().toISOString(),
    error_message: null,
  });
}

export async function markJobCompleted(jobId: string, resultJson?: Json) {
  return updateJob(jobId, {
    status: "completed",
    progress: 100,
    current_step: "Completed",
    result_json: resultJson ?? {},
    completed_at: new Date().toISOString(),
  });
}

export async function markJobFailed(jobId: string, errorMessage: string) {
  return updateJob(jobId, {
    status: "failed",
    progress: 100,
    current_step: "Failed",
    error_message: errorMessage.slice(0, 1000),
    completed_at: new Date().toISOString(),
  });
}

export async function listJobsForAdmin(input: ListJobsInput = {}) {
  const supabase = createAdminClient();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);

  let query = supabase
    .from(JOBS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.jobType) {
    query = query.eq("job_type", input.jobType);
  }

  const { data, error } = await query;

  if (error) {
    throwJobError(error, "Unable to load processing jobs.");
  }

  return data ?? [];
}

export async function listJobsForUser(userId: string, limit = 50) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(JOBS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (error) {
    throwJobError(error, "Unable to load user processing jobs.");
  }

  return data ?? [];
}

export async function safeListJobsForAdmin(input: ListJobsInput = {}) {
  try {
    return { jobs: await listJobsForAdmin(input), error: null as string | null };
  } catch (error) {
    if (error instanceof MissingDatabaseMigrationError) {
      return { jobs: [] as ProcessingJob[], error: error.message };
    }
    return {
      jobs: [] as ProcessingJob[],
      error: error instanceof Error ? error.message : "Unable to load processing jobs.",
    };
  }
}

async function updateJob(jobId: string, payload: ProcessingJobUpdate) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(JOBS_TABLE)
    .update(payload)
    .eq("id", jobId)
    .select("*")
    .single();

  if (error || !data) {
    throwJobError(error, "Unable to update processing job.");
  }

  return data;
}

function throwJobError(error: unknown, fallback: string): never {
  const migrationError = toMissingMigrationError(error, JOBS_TABLE);
  if (migrationError) {
    throw migrationError;
  }

  throw new Error(error instanceof Error ? error.message : fallback);
}

function clampProgress(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100);
}
