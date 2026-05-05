import { describe, expect, it } from "vitest";
import {
  buildWeaknessQuest,
  getSkillAccuracy,
  getTrapWeaknesses,
} from "@/lib/gamification/weakness";

function question(input: {
  id: string;
  skill: "LISTENING" | "READING";
  trapType?: string | null;
}) {
  return {
    id: input.id,
    skill_type: input.skill,
    trap_type: input.trapType ?? null,
  } as never;
}

function attempt(questionId: string, isCorrect: boolean) {
  return {
    question_id: questionId,
    is_correct: isCorrect,
    submitted_at: "2026-05-05T10:00:00.000Z",
  } as never;
}

describe("weakness detection", () => {
  it("flags trap weaknesses below 60% after five attempts", () => {
    const questions = new Map([
      ["l1", question({ id: "l1", skill: "LISTENING", trapType: "NEGATION" })],
    ]);

    const weaknesses = getTrapWeaknesses(
      [
        attempt("l1", false),
        attempt("l1", false),
        attempt("l1", true),
        attempt("l1", false),
        attempt("l1", true),
      ],
      questions,
    );

    expect(weaknesses).toHaveLength(1);
    expect(weaknesses[0]).toMatchObject({
      trapType: "NEGATION",
      skill: "LISTENING",
      attempts: 5,
      accuracy: 40,
    });
  });

  it("prioritizes listening when it trails reading by 15 points or more", () => {
    const questions = new Map([
      ["l1", question({ id: "l1", skill: "LISTENING", trapType: "FALSE_FRIEND" })],
      ["r1", question({ id: "r1", skill: "READING", trapType: "NEGATION" })],
    ]);

    const quest = buildWeaknessQuest({
      attempts: [
        attempt("l1", false),
        attempt("l1", false),
        attempt("l1", true),
        attempt("l1", false),
        attempt("l1", true),
        attempt("r1", true),
        attempt("r1", true),
        attempt("r1", true),
        attempt("r1", true),
        attempt("r1", false),
      ],
      questions,
    });

    expect(quest).toMatchObject({
      skill: "LISTENING",
      trapType: "FALSE_FRIEND",
      difficulty: "HARD",
    });
  });

  it("computes per-skill accuracy percentages", () => {
    const questions = new Map([
      ["r1", question({ id: "r1", skill: "READING" })],
    ]);

    expect(
      getSkillAccuracy([attempt("r1", true), attempt("r1", false)], questions, "READING"),
    ).toEqual({
      attempts: 2,
      accuracy: 50,
    });
  });
});
