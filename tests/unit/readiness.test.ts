import { describe, expect, it } from "vitest";
import { buildReadinessScore, getCefrEstimate } from "@/lib/gamification/readiness";

describe("B2 readiness calculation", () => {
  it("applies the weighted readiness formula", () => {
    const score = buildReadinessScore({
      listeningAccuracy: 80,
      readingAccuracy: 70,
      writingAverage: 65,
      speakingAverage: 75,
      vocabularyMastery: 60,
      consistencyScore: 40,
    });

    expect(score.overall).toBe(70);
    expect(score.bySkill).toEqual({
      LISTENING: 80,
      READING: 70,
      WRITING: 65,
      SPEAKING: 75,
    });
    expect(score.cefrEstimate).toBe("B2");
  });

  it("maps threshold scores to CEFR bands", () => {
    expect(getCefrEstimate(17)).toBe("A1");
    expect(getCefrEstimate(18)).toBe("A2");
    expect(getCefrEstimate(42)).toBe("B1");
    expect(getCefrEstimate(52)).toBe("B1_PLUS");
    expect(getCefrEstimate(60)).toBe("B2_MINUS");
    expect(getCefrEstimate(68)).toBe("B2");
    expect(getCefrEstimate(78)).toBe("B2_PLUS");
    expect(getCefrEstimate(90)).toBe("C1");
  });
});
