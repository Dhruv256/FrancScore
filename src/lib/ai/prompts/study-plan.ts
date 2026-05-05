import type { StudyPlanResponse } from "@/lib/ai/schemas";

export function buildStudyPlanMessages(input: {
  learnerName: string;
  targetExam: string | null;
  targetLevel: string | null;
  dailyTimeMinutes: number | null;
  readinessScore: number;
  weaknesses: string[];
  recommendedTasks: string[];
  days: number;
}) {
  return [
    {
      role: "system" as const,
      content:
        "You are FrancScore's study-plan coach for TEF/TCF Canada. Return only valid JSON. Produce a realistic plan that fits the learner's time budget.",
    },
    {
      role: "user" as const,
      content: [
        "Return JSON with this exact shape:",
        '{"summary":"","focus_areas":[],"daily_plan":[{"day":1,"title":"","minutes":45,"tasks":[""]}]}',
        "",
        `Learner: ${input.learnerName}`,
        `Target exam: ${input.targetExam ?? "Unknown"}`,
        `Target level: ${input.targetLevel ?? "Unknown"}`,
        `Daily time budget: ${input.dailyTimeMinutes ?? 45} minutes`,
        `Readiness score: ${input.readinessScore}/100`,
        `Primary weaknesses: ${input.weaknesses.join("; ") || "None yet"}`,
        `Preferred plan length: ${input.days} days`,
        "Ranked recommended tasks:",
        ...input.recommendedTasks.map((task, index) => `${index + 1}. ${task}`),
        "",
        "Rules:",
        "- Keep each day within the daily time budget.",
        "- Favor listening/reading/vocabulary drills over vague advice.",
        "- Use task wording that maps to real FrancScore product areas.",
        "- Return JSON only.",
      ].join("\n"),
    },
  ];
}

export function buildFallbackStudyPlan(input: {
  days: number;
  minutesPerDay: number;
  weaknesses: string[];
  recommendedTasks: string[];
}): StudyPlanResponse {
  const focusAreas = input.weaknesses.length
    ? input.weaknesses.slice(0, 3)
    : ["Reading accuracy", "Listening accuracy", "Vocabulary retention"];

  return {
    summary:
      "This fallback study plan prioritizes the weakest measurable areas first and keeps each session compact enough for daily consistency.",
    focus_areas: focusAreas,
    daily_plan: Array.from({ length: input.days }, (_, index) => ({
      day: index + 1,
      title: index % 2 === 0 ? "Accuracy Repair" : "Speed + Retention",
      minutes: input.minutesPerDay,
      tasks: input.recommendedTasks.slice(index % Math.max(input.recommendedTasks.length, 1)).slice(0, 3).length
        ? input.recommendedTasks.slice(index % input.recommendedTasks.length).slice(0, 3)
        : [
            "Complete one reading lab set and review explanations.",
            "Review weak flashcards and mark recurring mistakes.",
            "Finish one timed listening drill.",
          ],
    })),
  };
}
