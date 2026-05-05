import { NextResponse } from "next/server";
import { getAuthContext, getProfileDisplayName } from "@/lib/auth";
import {
  buildFallbackStudyPlan,
  buildStudyPlanMessages,
} from "@/lib/ai/prompts";
import {
  studyPlanRequestSchema,
  studyPlanResponseSchema,
} from "@/lib/ai/schemas";
import {
  generateStructuredObject,
  isNvidiaEnabled,
  NvidiaAIError,
  rerankTexts,
  runSafetyCheck,
} from "@/lib/ai/nvidia-client";
import { getUserReadinessSnapshot } from "@/lib/gamification/readiness";
import { getWeaknessQuest } from "@/lib/gamification/weakness";

const BASE_TASKS = [
  "Complete one Listening Lab timed drill and review the explanation.",
  "Complete one Reading Lab passage and note the trap type.",
  "Review 20 weak-word flashcards and reschedule missed cards.",
  "Write one short B1/B2 response and self-check connectors.",
  "Record one speaking outline with a clear introduction, example, and conclusion.",
  "Repeat one weakness quest and log the trap patterns you missed.",
];

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = studyPlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid study plan payload." },
      { status: 400 },
    );
  }

  try {
    const [{ readinessScore, skillProgress }, weaknessQuest] = await Promise.all([
      getUserReadinessSnapshot(user.id),
      getWeaknessQuest(user.id),
    ]);

    const weaknessLines = [
      weaknessQuest
        ? `${weaknessQuest.skill}: ${weaknessQuest.title} (${weaknessQuest.trapType})`
        : null,
      ...skillProgress
        .filter((skill) => !parsed.data.focusSkills || parsed.data.focusSkills.includes(skill.skill))
        .sort((left, right) => left.percentage - right.percentage)
        .slice(0, 3)
        .map((skill) => `${skill.skill}: ${skill.percentage}%`),
    ].filter((item): item is string => Boolean(item));

    const safety = await runSafetyCheck({
      userInput: weaknessLines.join("\n"),
      purpose: "Generate a personalized French exam study plan.",
    });

    if (!safety.allowed) {
      return NextResponse.json(
        { error: "A study plan could not be generated for this request." },
        { status: 400 },
      );
    }

    const rerankedTasks = isNvidiaEnabled()
      ? await getRerankedTasks(weaknessLines)
      : BASE_TASKS;

    const review = isNvidiaEnabled()
      ? await generateStructuredObject({
          schema: studyPlanResponseSchema,
          messages: buildStudyPlanMessages({
            learnerName: getProfileDisplayName(profile, user),
            targetExam: profile?.target_exam ?? null,
            targetLevel: profile?.target_level ?? null,
            dailyTimeMinutes: profile?.daily_time_minutes ?? 45,
            readinessScore: readinessScore.overall,
            weaknesses: weaknessLines,
            recommendedTasks: rerankedTasks,
            days: parsed.data.days,
          }),
          maxTokens: 1400,
        })
      : buildFallbackStudyPlan({
          days: parsed.data.days,
          minutesPerDay: profile?.daily_time_minutes ?? 45,
          weaknesses: weaknessLines,
          recommendedTasks: rerankedTasks,
        });

    return NextResponse.json({
      plan: review,
      source: isNvidiaEnabled() ? "ai" : "fallback",
    });
  } catch (error) {
    if (error instanceof NvidiaAIError) {
      return NextResponse.json(
        {
          error:
            error.code === "CONFIG"
              ? "AI study planning is not configured yet."
              : "The AI study planner is unavailable right now.",
          details: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate study plan." },
      { status: 500 },
    );
  }
}

async function getRerankedTasks(weaknessLines: string[]) {
  try {
    const rankings = await rerankTexts({
      query: weaknessLines.join(" | ") || "Improve TEF/TCF exam readiness",
      passages: BASE_TASKS,
    });

    if (!rankings.length) {
      return BASE_TASKS;
    }

    return rankings
      .map((ranking) => BASE_TASKS[ranking.index])
      .filter((task): task is string => Boolean(task));
  } catch {
    return BASE_TASKS;
  }
}
