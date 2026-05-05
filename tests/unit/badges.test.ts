import { describe, expect, it } from "vitest";
import { BADGE_TARGETS, computeBadgeMetrics } from "@/lib/gamification/badges";

function question(input: {
  id: string;
  skill: "LISTENING" | "READING";
  trapType?: string | null;
  passageId?: string | null;
}) {
  return {
    id: input.id,
    skill_type: input.skill,
    trap_type: input.trapType ?? null,
    passage_id: input.passageId ?? null,
  } as never;
}

function attempt(input: {
  questionId: string;
  isCorrect: boolean;
  submittedAt?: string;
  timeTakenSeconds?: number;
}) {
  return {
    question_id: input.questionId,
    is_correct: input.isCorrect,
    submitted_at: input.submittedAt ?? "2026-05-05T10:00:00.000Z",
    time_taken_seconds: input.timeTakenSeconds ?? 20,
  } as never;
}

describe("badge unlock logic", () => {
  it("computes badge progress from user activity", () => {
    const questions = new Map([
      ["q-neg", question({ id: "q-neg", skill: "READING", trapType: "NEGATION", passageId: "p-1" })],
      ["q-listen", question({ id: "q-listen", skill: "LISTENING", trapType: "FALSE_FRIEND" })],
      ["q-read-2", question({ id: "q-read-2", skill: "READING", passageId: "p-1" })],
    ]);
    const passages = new Map([
      [
        "p-1",
        {
          id: "p-1",
          estimated_minutes: 2,
        } as never,
      ],
    ]);

    const metrics = computeBadgeMetrics({
      attempts: [
        attempt({ questionId: "q-neg", isCorrect: true, timeTakenSeconds: 30 }),
        attempt({ questionId: "q-listen", isCorrect: true, submittedAt: "2026-05-01T10:00:00.000Z" }),
        attempt({ questionId: "q-listen", isCorrect: true, submittedAt: "2026-05-02T10:00:00.000Z" }),
        attempt({ questionId: "q-listen", isCorrect: true, submittedAt: "2026-05-03T10:00:00.000Z" }),
        attempt({ questionId: "q-listen", isCorrect: true, submittedAt: "2026-05-04T10:00:00.000Z" }),
        attempt({ questionId: "q-listen", isCorrect: true, submittedAt: "2026-05-05T10:00:00.000Z" }),
        attempt({ questionId: "q-read-2", isCorrect: true, timeTakenSeconds: 40 }),
      ],
      questions,
      passages,
      writingSubmissions: [
        { review_result: { estimatedLevel: "B2" } } as never,
        { review_result: { overallScore: 72 } } as never,
      ],
      speakingSubmissions: [{ id: "s-1" }, { id: "s-2" }] as never,
      mockResults: [{ id: "m-1" }] as never,
    });

    expect(metrics.get("Negation Hunter")).toEqual({
      current: 1,
      target: BADGE_TARGETS["Negation Hunter"],
    });
    expect(metrics.get("Listening Survivor")).toEqual({
      current: 5,
      target: BADGE_TARGETS["Listening Survivor"],
    });
    expect(metrics.get("B2 Writer")).toEqual({
      current: 2,
      target: BADGE_TARGETS["B2 Writer"],
    });
    expect(metrics.get("Speaking Builder")).toEqual({
      current: 2,
      target: BADGE_TARGETS["Speaking Builder"],
    });
    expect(metrics.get("Mock Warrior")).toEqual({
      current: 1,
      target: BADGE_TARGETS["Mock Warrior"],
    });
    expect(metrics.get("Speed Reader")).toEqual({
      current: 1,
      target: BADGE_TARGETS["Speed Reader"],
    });
    expect(metrics.get("Trap Killer")).toEqual({
      current: 6,
      target: BADGE_TARGETS["Trap Killer"],
    });
  });
});
