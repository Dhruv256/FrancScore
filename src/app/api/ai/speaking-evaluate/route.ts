import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { buildFallbackSpeakingEvaluation, buildSpeakingEvaluationMessages } from "@/lib/ai/prompts";
import {
  speakingEvaluateRequestSchema,
  speakingEvaluationSchema,
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
import type { SpeakingFeedback } from "@/lib/types";
import { checkAiUsage, logAiUsage } from "@/lib/ai/rate-limit";

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const usage = await checkAiUsage(user.id, "speaking_evaluation", profile?.role ?? "USER");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: "Daily speaking evaluation limit reached.",
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
  const parsed = speakingEvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid speaking evaluation payload." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const context = await resolveSpeakingContext(user.id, parsed.data, supabase);

    if (!context.transcript) {
      return NextResponse.json(
        {
          error:
            "A transcript is required for speaking evaluation right now. The selected optional Parakeet STT model is not auto-enabled in this French flow yet.",
        },
        { status: 400 },
      );
    }

    try {
      if (isNvidiaEnabled()) {
        const safety = await runSafetyCheck({
          userInput: `${context.prompt.prompt}\n\n${context.transcript}`,
          purpose: "Evaluate a French speaking transcript for exam-prep feedback.",
        });

        if (!safety.allowed) {
          return NextResponse.json(
            {
              submissionId: context.submissionId,
              status: "pending_review",
              error: "This transcript could not be processed automatically.",
              reason: safety.reason,
            },
            { status: 400 },
          );
        }
      }

      const reviewPayload = isNvidiaEnabled()
        ? await generateStructuredObject({
            schema: speakingEvaluationSchema,
            messages: buildSpeakingEvaluationMessages({
              promptTitle: context.prompt.title,
              promptText: context.prompt.prompt,
              criteria: normalizeStringArray(context.prompt.criteria),
              transcript: context.transcript,
            }),
          })
        : buildFallbackSpeakingEvaluation({
            transcript: context.transcript,
          });

      const feedback = toSpeakingFeedback(reviewPayload, {
        submissionId: context.submissionId,
        modelId: isNvidiaEnabled() ? getConfiguredModelId("MAIN") : "fallback-speaking-review",
        transcript: context.transcript,
      });

      const { error: updateError } = await supabase
        .from("speaking_submissions")
        .update({
          review_result:
            feedback as unknown as Database["public"]["Tables"]["speaking_submissions"]["Row"]["review_result"],
          estimated_cefr: feedback.estimatedCefrLevel,
          score_20: feedback.score20 ?? null,
          transcript: context.transcript,
          status: "reviewed",
        })
        .eq("id", context.submissionId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          formatSupabaseError(updateError, {
            operation: "save speaking review",
            table: "public.speaking_submissions",
            env: "server",
          }).developerMessage,
        );
      }

      if (context.isNewSubmission) {
        await applyXpAndStreak(user.id, XP_REWARDS.SPEAKING_SUBMISSION, context.submittedAt);
      }

      // Log usage after successful evaluation
      await logAiUsage(user.id, "speaking_evaluation", {
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
      const fallbackPayload = buildFallbackSpeakingEvaluation({
        transcript: context.transcript,
      });
      const feedback = toSpeakingFeedback(fallbackPayload, {
        submissionId: context.submissionId,
        modelId: "fallback-speaking-review",
        transcript: context.transcript,
      });

      const { error: updateError } = await supabase
        .from("speaking_submissions")
        .update({
          review_result:
            feedback as unknown as Database["public"]["Tables"]["speaking_submissions"]["Row"]["review_result"],
          estimated_cefr: feedback.estimatedCefrLevel,
          score_20: feedback.score20 ?? null,
          transcript: context.transcript,
          status: "ai_failed",
        })
        .eq("id", context.submissionId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          formatSupabaseError(updateError, {
            operation: "save fallback speaking review",
            table: "public.speaking_submissions",
            env: "server",
          }).developerMessage,
        );
      }

      if (context.isNewSubmission) {
        await applyXpAndStreak(user.id, XP_REWARDS.SPEAKING_SUBMISSION, context.submittedAt);
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
          "Your speaking submission was saved, but the NVIDIA review failed. FrancScore is showing fallback feedback for now.",
        details: message,
      });
    }
  } catch (error) {
    if (error instanceof NvidiaAIError) {
      return NextResponse.json(
        {
          error:
            error.code === "CONFIG"
              ? "AI speaking review is not configured yet."
              : "The AI speaking evaluator is unavailable right now.",
          details: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: formatSupabaseError(error, {
          operation: "evaluate speaking submission",
          table: "public.speaking_submissions",
          env: "server",
        }).userMessage,
        ...(process.env.NODE_ENV === "development"
          ? {
              details: formatSupabaseError(error, {
                operation: "evaluate speaking submission",
                table: "public.speaking_submissions",
                env: "server",
              }).developerMessage,
            }
          : {}),
      },
      { status: 500 },
    );
  }
}

async function resolveSpeakingContext(
  userId: string,
  input: {
    submission_id?: string;
    prompt_id?: string;
    transcript?: string;
    audio_path?: string;
  },
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  if (input.submission_id) {
    const { data: submission, error: submissionError } = await supabase
      .from("speaking_submissions")
      .select("*")
      .eq("id", input.submission_id)
      .eq("user_id", userId)
      .single();

    if (submissionError || !submission) {
      throw new Error("Speaking submission not found.");
    }

    const { data: prompt, error: promptError } = await supabase
      .from("speaking_prompts")
      .select("*")
      .eq("id", submission.prompt_id)
      .single();

    if (promptError || !prompt) {
      throw new Error("Speaking prompt not found.");
    }

    return {
      submissionId: submission.id,
      transcript: submission.transcript,
      submittedAt: submission.created_at,
      isNewSubmission: false,
      prompt,
    };
  }

  const { data: prompt, error: promptError } = await supabase
    .from("speaking_prompts")
    .select("*")
    .eq("id", input.prompt_id ?? "")
    .single();

  if (promptError || !prompt) {
    throw new Error("Speaking prompt not found.");
  }

  const transcript = input.transcript?.trim() ?? "";
  if (transcript && getWordCount(transcript) < 15) {
    throw new Error("Your transcript is too short. Please provide a fuller speaking response.");
  }

  const audioPath =
    input.audio_path?.trim() || (transcript ? "placeholder://manual-transcript" : "placeholder://audio-coming-soon");

  const { data: submission, error: submissionError } = await supabase
    .from("speaking_submissions")
    .insert({
      user_id: userId,
      prompt_id: prompt.id,
      transcript: transcript || null,
      audio_path: audioPath,
      status: "pending_review",
    })
    .select("id, created_at")
    .single();

  if (submissionError || !submission) {
    throw new Error(
      formatSupabaseError(submissionError ?? new Error("Unable to save speaking submission."), {
        operation: "create speaking submission",
        table: "public.speaking_submissions",
        env: "server",
      }).developerMessage,
    );
  }

  return {
    submissionId: submission.id,
    transcript: transcript || null,
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

function toSpeakingFeedback(
  review: Awaited<ReturnType<typeof buildFallbackSpeakingEvaluation>>,
  input: {
    submissionId: string;
    modelId: string;
    transcript: string;
  },
): SpeakingFeedback {
  return {
    id: `speaking-review-${input.submissionId}`,
    submissionType: "SPEAKING",
    modelId: input.modelId,
    overallScore: review.score_20 * 5,
    estimatedCefrLevel: review.estimated_cefr,
    strengths: [
      review.feedback,
      ...review.better_phrases.slice(0, 2).map((phrase) => `Try phrasing such as: ${phrase}`),
    ],
    weaknesses: review.repeated_words.length
      ? [`Repeated words detected: ${review.repeated_words.join(", ")}`]
      : ["Keep improving fluency and response structure."],
    suggestions: [
      ...review.better_phrases.slice(0, 3),
      review.next_drill,
    ],
    createdAt: new Date().toISOString(),
    fluency: review.fluency_score,
    grammar: review.grammar_score,
    vocabulary: review.vocabulary_score,
    structure: review.structure_score,
    taskRelevance: review.task_relevance_score,
    score20: review.score_20,
    estimatedScore: review.score_20 * 5,
    transcript: input.transcript,
    feedbackSummary: review.feedback,
    betterPhrases: review.better_phrases,
    corrections: review.better_phrases.map((phrase) => ({
      original: "Use a more precise phrase",
      corrected: phrase,
    })),
  };
}
