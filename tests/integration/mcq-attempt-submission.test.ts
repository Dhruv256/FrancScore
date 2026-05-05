import { describe, expect, it, vi } from "vitest";

const mockGetAuthContext = vi.hoisted(() => vi.fn());
const mockSubmitPracticeAttempt = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getAuthContext: mockGetAuthContext,
}));

vi.mock("@/lib/practice/server", () => ({
  submitPracticeAttempt: mockSubmitPracticeAttempt,
}));

describe("MCQ attempt submission route", () => {
  it("rejects unauthenticated submissions", async () => {
    mockGetAuthContext.mockResolvedValue({ user: null });
    const { POST } = await import("@/app/api/practice/attempts/route");
    const response = await POST(
      new Request("http://localhost/api/practice/attempts", {
        method: "POST",
        body: JSON.stringify({
          questionId: "question-1",
          selectedAnswerIndex: 1,
          timeTakenSeconds: 12,
          mode: "learning",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("normalizes and forwards valid attempt payloads", async () => {
    mockGetAuthContext.mockResolvedValue({ user: { id: "user-1" } });
    mockSubmitPracticeAttempt.mockResolvedValue({
      questionId: "question-1",
      correctAnswerIndex: 2,
      isCorrect: true,
      explanation: "Because it matches the passage.",
      trapType: "NEGATION",
      transcript: null,
      progress: {
        skillAccuracy: 80,
        totalAttempted: 5,
        recentWeakTrapTypes: ["NEGATION"],
      },
    });

    const { POST } = await import("@/app/api/practice/attempts/route");
    const response = await POST(
      new Request("http://localhost/api/practice/attempts", {
        method: "POST",
        body: JSON.stringify({
          questionId: "question-1",
          selectedAnswerIndex: 2,
          timeTakenSeconds: 12.7,
          mode: "timed",
        }),
      }),
    );

    expect(mockSubmitPracticeAttempt).toHaveBeenCalledWith("user-1", {
      questionId: "question-1",
      selectedAnswerIndex: 2,
      timeTakenSeconds: 13,
      mode: "timed",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      questionId: "question-1",
      isCorrect: true,
    });
  });
});
