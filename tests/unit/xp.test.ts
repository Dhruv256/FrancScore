import { describe, expect, it } from "vitest";
import { getMcqXp, XP_REWARDS } from "@/lib/gamification/xp";

describe("XP calculation", () => {
  it("returns base XP for an incorrect MCQ", () => {
    expect(getMcqXp(false)).toBe(XP_REWARDS.MCQ_ANSWERED);
  });

  it("adds the correct-answer bonus for a correct MCQ", () => {
    expect(getMcqXp(true)).toBe(
      XP_REWARDS.MCQ_ANSWERED + XP_REWARDS.MCQ_CORRECT_BONUS,
    );
  });

  it("keeps the configured reward constants stable", () => {
    expect(XP_REWARDS.WRITING_SUBMISSION).toBe(80);
    expect(XP_REWARDS.SPEAKING_SUBMISSION).toBe(80);
    expect(XP_REWARDS.MOCK_TEST_COMPLETED).toBe(300);
  });
});
