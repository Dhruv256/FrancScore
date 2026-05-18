import "server-only";

import { generateDailyVocabularyBatch } from "@/lib/ai/generate-daily-vocab";
import {
  createJob,
  getJob,
  getJobForUser,
  listJobsForAdmin,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
  safeListJobsForAdmin,
  updateJobProgress,
  type ProcessingJob,
} from "@/lib/jobs/jobs";
import type { Json } from "@/lib/supabase/database.types";

export {
  getJob as getProcessingJobById,
  listJobsForAdmin,
  safeListJobsForAdmin,
};

export async function createProcessingJob(input: {
  userId?: string | null;
  jobType: string;
  inputJson?: Json;
  totalSteps?: number | null;
  currentStep?: string | null;
}) {
  return createJob(input);
}

export async function getProcessingJob(jobId: string, userId?: string | null, isAdmin = false) {
  return userId ? getJobForUser(jobId, userId, isAdmin) : getJob(jobId);
}

export async function listProcessingJobs(limit = 50) {
  return listJobsForAdmin({ limit });
}

export async function processNextJobStep(jobId: string) {
  const job = await getJob(jobId);

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

async function processDailyVocabJob(job: ProcessingJob) {
  await markJobProcessing(job.id, "Generating and validating vocabulary");
  await updateJobProgress(job.id, {
    progress: 5,
    currentStep: "Generating and validating vocabulary",
  });

  try {
    const summary = await generateDailyVocabularyBatch({
      jobId: job.id,
      userId: job.user_id,
      onProgress: async (progress, currentStep) => {
        await updateJobProgress(job.id, { progress, currentStep });
      },
    });

    return markJobCompleted(job.id, summary as unknown as Json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed.";
    return markJobFailed(job.id, message);
  }
}
