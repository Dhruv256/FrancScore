import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { TrapType, WeaknessQuest } from "@/lib/types";

type TrapWeakness = {
  trapType: TrapType;
  skill: "LISTENING" | "READING";
  accuracy: number;
  attempts: number;
};

export async function getWeaknessQuest(userId: string): Promise<WeaknessQuest | null> {
  const supabase = await createClient();
  const [attemptsResult, questionsResult] = await Promise.all([
    supabase.from("attempts").select("*").eq("user_id", userId),
    supabase.from("questions").select("*"),
  ]);

  if (attemptsResult.error) {
    throw new Error(attemptsResult.error.message);
  }
  if (questionsResult.error) {
    throw new Error(questionsResult.error.message);
  }

  const attempts = attemptsResult.data ?? [];
  const questions = new Map((questionsResult.data ?? []).map((row) => [row.id, row]));

  return buildWeaknessQuest({
    attempts,
    questions,
  });
}

export function buildWeaknessQuest(input: {
  attempts: Database["public"]["Tables"]["attempts"]["Row"][];
  questions: Map<string, Database["public"]["Tables"]["questions"]["Row"]>;
}): WeaknessQuest | null {
  const listeningAccuracy = getSkillAccuracy(input.attempts, input.questions, "LISTENING");
  const readingAccuracy = getSkillAccuracy(input.attempts, input.questions, "READING");
  const trapWeaknesses = getTrapWeaknesses(input.attempts, input.questions);

  if (listeningAccuracy.attempts >= 5 && listeningAccuracy.accuracy + 15 <= readingAccuracy.accuracy) {
    const priorityTrap =
      trapWeaknesses.find((weakness) => weakness.skill === "LISTENING")?.trapType ?? "NEGATION";

    return {
      id: `weakness-listening-${priorityTrap.toLowerCase()}`,
      title: "Listening Priority Recovery",
      description: `Listening is trailing reading by ${Math.round(
        readingAccuracy.accuracy - listeningAccuracy.accuracy,
      )} points. Focus on ${formatTrapLabel(priorityTrap).toLowerCase()} before your next drill.`,
      skill: "LISTENING",
      trapType: priorityTrap,
      questionsCount: 10,
      xpReward: 150,
      difficulty: "HARD",
    };
  }

  const weakestTrap = trapWeaknesses[0];
  if (!weakestTrap) {
    return null;
  }

  return {
    id: `weakness-${weakestTrap.skill.toLowerCase()}-${weakestTrap.trapType.toLowerCase()}`,
    title: `${weakestTrap.skill === "LISTENING" ? "Listening" : "Reading"}: ${formatTrapLabel(weakestTrap.trapType)}`,
    description: `Your ${formatTrapLabel(weakestTrap.trapType).toLowerCase()} accuracy is ${Math.round(
      weakestTrap.accuracy,
    )}% after ${weakestTrap.attempts} attempts. This is the clearest repair target right now.`,
    skill: weakestTrap.skill,
    trapType: weakestTrap.trapType,
    questionsCount: 8,
    xpReward: 120,
    difficulty: weakestTrap.accuracy < 40 ? "HARD" : "MEDIUM",
  };
}

export function getSkillAccuracy(
  attempts: Database["public"]["Tables"]["attempts"]["Row"][],
  questions: Map<string, Database["public"]["Tables"]["questions"]["Row"]>,
  skill: "LISTENING" | "READING",
) {
  const relevantAttempts = attempts.filter(
    (attempt) => questions.get(attempt.question_id)?.skill_type === skill,
  );

  if (!relevantAttempts.length) {
    return { attempts: 0, accuracy: 0 };
  }

  const correct = relevantAttempts.filter((attempt) => attempt.is_correct).length;
  return {
    attempts: relevantAttempts.length,
    accuracy: (correct / relevantAttempts.length) * 100,
  };
}

export function getTrapWeaknesses(
  attempts: Database["public"]["Tables"]["attempts"]["Row"][],
  questions: Map<string, Database["public"]["Tables"]["questions"]["Row"]>,
) {
  const trapStats = new Map<string, { trapType: TrapType; skill: "LISTENING" | "READING"; total: number; correct: number }>();

  for (const attempt of attempts) {
    const question = questions.get(attempt.question_id);
    if (!question?.trap_type) {
      continue;
    }
    if (question.skill_type !== "LISTENING" && question.skill_type !== "READING") {
      continue;
    }

    const trapType = normalizeTrapType(question.trap_type);
    if (!trapType) {
      continue;
    }

    const key = `${question.skill_type}:${trapType}`;
    const bucket =
      trapStats.get(key) ??
      { trapType, skill: question.skill_type, total: 0, correct: 0 };
    bucket.total += 1;
    bucket.correct += attempt.is_correct ? 1 : 0;
    trapStats.set(key, bucket);
  }

  return [...trapStats.values()]
    .map((bucket) => ({
      trapType: bucket.trapType,
      skill: bucket.skill,
      attempts: bucket.total,
      accuracy: bucket.total ? (bucket.correct / bucket.total) * 100 : 0,
    }))
    .filter((bucket): bucket is TrapWeakness => bucket.attempts >= 5 && bucket.accuracy < 60)
    .sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts);
}

function normalizeTrapType(value: string): TrapType | null {
  if (
    value === "NEGATION" ||
    value === "NUMBER_DATE" ||
    value === "CONTRAST_MARKER" ||
    value === "SYNONYM_TRAP" ||
    value === "FALSE_FRIEND" ||
    value === "DOUBLE_NEGATIVE" ||
    value === "IMPLICIT_MEANING"
  ) {
    return value;
  }

  return null;
}

function formatTrapLabel(trapType: TrapType) {
  switch (trapType) {
    case "NEGATION":
      return "Negation";
    case "NUMBER_DATE":
      return "Number / Date";
    case "CONTRAST_MARKER":
      return "Contrast Markers";
    case "SYNONYM_TRAP":
      return "Synonym Traps";
    case "FALSE_FRIEND":
      return "False Friends";
    case "DOUBLE_NEGATIVE":
      return "Double Negatives";
    case "IMPLICIT_MEANING":
      return "Implicit Meaning";
  }
}
