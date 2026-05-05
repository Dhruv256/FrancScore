import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthContext = vi.hoisted(() => vi.fn());
const mockCreateClient = vi.hoisted(() => vi.fn());
const mockCreateAdminClient = vi.hoisted(() => vi.fn());
const mockApplyXpAndStreak = vi.hoisted(() => vi.fn());
const mockGenerateStructuredObject = vi.hoisted(() => vi.fn());
const mockIsNvidiaEnabled = vi.hoisted(() => vi.fn(() => false));
const mockRunSafetyCheck = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getAuthContext: mockGetAuthContext,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/gamification/xp", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gamification/xp")>(
    "@/lib/gamification/xp",
  );

  return {
    ...actual,
    applyXpAndStreak: mockApplyXpAndStreak,
  };
});

vi.mock("@/lib/ai/nvidia-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/nvidia-client")>(
    "@/lib/ai/nvidia-client",
  );

  return {
    ...actual,
    generateStructuredObject: mockGenerateStructuredObject,
    isNvidiaEnabled: mockIsNvidiaEnabled,
    runSafetyCheck: mockRunSafetyCheck,
  };
});

function buildSpeakingSupabaseStub() {
  const prompt = {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Talk about your city",
    prompt: "Describe where you live and what you enjoy there.",
    criteria: ["Fluency", "Vocabulary"],
  };
  const submission = {
    id: "44444444-4444-4444-8444-444444444444",
    created_at: "2026-05-05T09:00:00.000Z",
  };
  const updatePayloads: unknown[] = [];

  return {
    prompt,
    submission,
    updatePayloads,
    client: {
      from(table: string) {
        if (table === "speaking_prompts") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: prompt, error: null }),
              }),
            }),
          };
        }

        if (table === "speaking_submissions") {
          return {
            insert: (payload: unknown) => ({
              select: () => ({
                single: async () => ({ data: { ...submission, payload }, error: null }),
              }),
            }),
            update: (payload: unknown) => {
              updatePayloads.push(payload);
              return {
                eq: () => ({
                  eq: async () => ({ error: null }),
                }),
              };
            },
          };
        }

        if (table === "ai_usage_logs") {
          return {
            // SELECT for rate-limit check — return count=0 (user is under limit)
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: async () => ({ count: 0, error: null }),
                }),
              }),
            }),
            // INSERT for usage logging — fire-and-forget, no-op
            insert: () => ({
              then: (cb: (v: { error: null }) => void) => cb({ error: null }),
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    },
  };
}

describe("speaking submission flow", () => {
  beforeEach(() => {
    mockGetAuthContext.mockResolvedValue({ user: { id: "user-1" }, profile: { role: "USER" } });
    mockApplyXpAndStreak.mockResolvedValue(null);
    mockGenerateStructuredObject.mockReset();
    mockRunSafetyCheck.mockReset();
    mockIsNvidiaEnabled.mockReturnValue(false);
  });

  it("saves a transcript-first submission and returns fallback feedback", async () => {
    const supabase = buildSpeakingSupabaseStub();
    mockCreateClient.mockResolvedValue(supabase.client);
    mockCreateAdminClient.mockReturnValue(supabase.client);

    const { POST } = await import("@/app/api/ai/speaking-evaluate/route");
    const response = await POST(
      new Request("http://localhost/api/ai/speaking-evaluate", {
        method: "POST",
        body: JSON.stringify({
          prompt_id: supabase.prompt.id,
          transcript:
            "Bonjour, je vis dans une ville tres active et multiculturelle. J aime les transports publics, les parcs et les occasions de pratiquer le francais tous les jours avec mes amis et mes collegues.",
        }),
      }),
    );

    const payload = (await response.json()) as {
      status: string;
      source: string;
      submissionId: string;
      feedback: { score20: number | null; transcript: string };
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("reviewed");
    expect(payload.source).toBe("fallback");
    expect(payload.submissionId).toBe(supabase.submission.id);
    expect(payload.feedback.score20).not.toBeNull();
    expect(payload.feedback.transcript).toContain("Bonjour");
    expect(supabase.updatePayloads[0]).toMatchObject({
      status: "reviewed",
    });
    expect(mockApplyXpAndStreak).toHaveBeenCalledTimes(1);
  });
});
