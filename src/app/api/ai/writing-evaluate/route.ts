import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { buildFallbackWritingEvaluation, buildWritingEvaluationMessages } from "@/lib/ai/prompts";
import {
  writingEvaluateRequestSchema,
  writingEvaluationSchema,
} from "@/lib/ai/schemas";
import {
  generateStructuredObject,
  getConfiguredModelId,
  isNvidiaEnabled,
  NvidiaAIError,
  runSafetyCheck,
} from "@/lib/ai/nvidia-client";
import { XP_REWARDS, applyXpAndStreak } from "@/lib/gamification/xp";
import { formatSupabaseError } from "@/lib/errors/supabase-error";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { WritingFeedback } from "@/lib/types";
import { checkAiUsage, logAiUsage } from "@/lib/ai/rate-limit";

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const usage = await checkAiUsage(user.id, "writing_evaluation", profile?.role ?? "USER");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: "Daily writing evaluation limit reached.",
        limit: usage.limit,
        resetAt: usage.resetAt,
        hint: "Upgrade to Pro for more evaluations per day.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(usage.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": usage.resetAt,
          "Retry-After": String(Math.ceil((new Date(usage.resetAt).getTime() - Date.now()) / 1000)),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = writingEvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid writing evaluation payload." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const context = await resolveWritingContext(user.id, parsed.data, supabase);

    try {
      if (isNvidiaEnabled()) {
        const safety = await runSafetyCheck({
          userInput: `${context.prompt.prompt}\n\n${context.submissionText}`,
          purpose: "Evaluate a French writing submission for exam-prep feedback.",
        });

        if (!safety.allowed) {
          return NextResponse.json(
            {
              submissionId: context.submissionId,
              status: "pending_review",
              error: "This submission could not be processed automatically.",
              reason: safety.reason,
            },
            { status: 400 },
          );
        }
      }

      const reviewPayload = isNvidiaEnabled()
        ? await generateStructuredObject({
            schema: writingEvaluationSchema,
            messages: buildWritingEvaluationMessages({
              promptTitle: context.prompt.title,
              promptText: context.prompt.prompt,
              criteria: normalizeStringArray(context.prompt.criteria),
              submissionText: context.submissionText,
            }),
          })
        : buildFallbackWritingEvaluation({
            submissionText: context.submissionText,
          });

      const feedback = toWritingFeedback(reviewPayload, {
        submissionId: context.submissionId,
        modelId: isNvidiaEnabled() ? getConfiguredModelId("MAIN") : "fallback-writing-review",
      });

      const { error: updateError } = await supabase
        .from("writing_submissions")
        .update({
          review_result: feedback as unknown as Database["public"]["Tables"]["writing_submissions"]["Row"]["review_result"],
          estimated_cefr: feedback.estimatedLevel,
          score_20: feedback.score20 ?? null,
          status: "reviewed",
        })
        .eq("id", context.submissionId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          formatSupabaseError(updateError, {
            operation: "save writing review",
            table: "public.writing_submissions",
            env: "server",
          }).developerMessage,
        );
      }

      if (context.isNewSubmission) {
        await applyXpAndStreak(user.id, XP_REWARDS.WRITING_SUBMISSION, context.submittedAt);
      }

      // Log usage after successful evaluation
      await logAiUsage(user.id, "writing_evaluation", {
        submissionId: context.submissionId,
        source: isNvidiaEnabled() ? "ai" : "fallback",
      });

      return NextResponse.json(
        {
          submissionId: context.submissionId,
          status: "reviewed",
          feedback,
          source: isNvidiaEnabled() ? "ai" : "fallback",
          rateLimit: { remaining: usage.remaining - 1, limit: usage.limit, resetAt: usage.resetAt },
        },
        {
          headers: {
            "X-RateLimit-Limit": String(usage.limit),
            "X-RateLimit-Remaining": String(Math.max(0, usage.remaining - 1)),
            "X-RateLimit-Reset": usage.resetAt,
          },
        },
      );
    } catch (error) {
      const fallbackPayload = buildFallbackWritingEvaluation({
        submissionText: context.submissionText,
      });
      const feedback = toWritingFeedback(fallbackPayload, {
        submissionId: context.submissionId,
        modelId: "fallback-writing-review",
      });

      const { error: updateError } = await supabase
        .from("writing_submissions")
        .update({
          review_result: feedback as unknown as Database["public"]["Tables"]["writing_submissions"]["Row"]["review_result"],
          estimated_cefr: feedback.estimatedLevel,
          score_20: feedback.score20 ?? null,
          status: "ai_failed",
        })
        .eq("id", context.submissionId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          formatSupabaseError(updateError, {
            operation: "save fallback writing review",
            table: "public.writing_submissions",
            env: "server",
          }).developerMessage,
        );
      }

      if (context.isNewSubmission) {
        await applyXpAndStreak(user.id, XP_REWARDS.WRITING_SUBMISSION, context.submittedAt);
      }

      const message =
        error instanceof NvidiaAIError
          ? error.message
          : error instanceof Error
          ? error.message
          : "The AI review could not be completed.";

      return NextResponse.json({
        submissionId: context.submissionId,
        status: "ai_failed",
        feedback,
        source: "fallback",
        warning:
          "Your writing was saved, but the NVIDIA review failed. FrancScore is showing fallback feedback for now.",
        details: message,
      });
    }
  } catch (error) {
    if (error instanceof NvidiaAIError) {
      return NextResponse.json(
        {
          error:
            error.code === "CONFIG"
              ? "AI review is not configured yet. Using fallback feedback is recommended."
              : "The AI writing evaluator is unavailable right now.",
          details: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: formatSupabaseError(error, {
          operation: "evaluate writing submission",
          table: "public.writing_submissions",
          env: "server",
        }).userMessage,
        ...(process.env.NODE_ENV === "development"
          ? {
              details: formatSupabaseError(error, {
                operation: "evaluate writing submission",
                table: "public.writing_submissions",
                env: "server",
              }).developerMessage,
            }
          : {}),
      },
      { status: 500 },
    );
  }
}

async function resolveWritingContext(
  userId: string,
  input: { submission_id?: string; prompt_id?: string; submission_text?: string },
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  if (input.submission_id) {
    const { data: submission, error: submissionError } = await supabase
      .from("writing_submissions")
      .select("*")
      .eq("id", input.submission_id)
      .eq("user_id", userId)
      .single();

    if (submissionError || !submission) {
      throw new Error("Writing submission not found.");
    }

    const { data: prompt, error: promptError } = await supabase
      .from("writing_prompts")
      .select("*")
      .eq("id", submission.prompt_id)
      .single();

    if (promptError || !prompt) {
      throw new Error("Writing prompt not found.");
    }

    return {
      submissionId: submission.id,
      submissionText: submission.submitted_text,
      submittedAt: submission.created_at,
      isNewSubmission: false,
      prompt,
    };
  }

  const { data: prompt, error: promptError } = await supabase
    .from("writing_prompts")
    .select("*")
    .eq("id", input.prompt_id ?? "")
    .single();

  if (promptError || !prompt) {
    throw new Error("Writing prompt not found.");
  }

  const submissionText = input.submission_text ?? "";
  const wordCount = getWordCount(submissionText);
  const minWords = prompt.word_limit_min ?? 80;
  const maxWords = prompt.word_limit_max ?? 220;

  if (wordCount < minWords) {
    throw new Error(`Your answer is too short. Please write at least ${minWords} words.`);
  }

  if (wordCount > maxWords + 120) {
    throw new Error(`Your answer is too long. Please keep it near ${maxWords} words.`);
  }

  const { data: submission, error: submissionError } = await supabase
    .from("writing_submissions")
    .insert({
      user_id: userId,
      prompt_id: prompt.id,
      submitted_text: submissionText,
      word_count: wordCount,
      status: "pending_review",
    })
    .select("id, created_at")
    .single();

  if (submissionError || !submission) {
    throw new Error(
      formatSupabaseError(submissionError ?? new Error("Unable to save writing submission."), {
        operation: "create writing submission",
        table: "public.writing_submissions",
        env: "server",
      }).developerMessage,
    );
  }

  return {
    submissionId: submission.id,
    submissionText,
    submittedAt: submission.created_at,
    isNewSubmission: true,
    prompt,
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function toWritingFeedback(
  review: Awaited<ReturnType<typeof buildFallbackWritingEvaluation>>,
  input: {
    submissionId: string;
    modelId: string;
  },
): WritingFeedback {
  const grammarIssues = review.errors
    .filter((error) => error.type === "grammar" || error.type === "structure" || error.type === "task_relevance")
    .map((error) => ({
      text: error.original,
      correction: error.correction,
      explanation: error.explanation,
    }));

  const vocabularyUpgrades = review.errors
    .filter((error) => error.type === "vocabulary")
    .map((error) => ({
      original: error.original,
      suggestion: error.correction,
      reason: error.explanation,
    }));

  return {
    id: `writing-review-${input.submissionId}`,
    submissionType: "WRITING",
    modelId: input.modelId,
    overallScore: review.score_20 * 5,
    score: review.score_20 * 5,
    score20: review.score_20,
    estimatedCefrLevel: review.estimated_cefr,
    estimatedLevel: review.estimated_cefr,
    taskCompletion: review.task_completion,
    grammarScore: review.grammar_score,
    vocabularyScore: review.vocabulary_score,
    structureScore: review.structure_score,
    strengths: review.strengths,
    weaknesses: review.weaknesses,
    suggestions: [
      ...review.weaknesses.slice(0, 2),
      review.next_drill,
    ].filter(Boolean),
    createdAt: new Date().toISOString(),
    grammarIssues,
    vocabularyUpgrades,
    structureFeedback:
      review.weaknesses[0] ??
      "Strengthen paragraph flow and make each argument more explicit.",
    b2Rewrite: review.b2_rewrite,
    rewrittenResponse: review.b2_rewrite,
    nextDrill: review.next_drill,
  };
}
