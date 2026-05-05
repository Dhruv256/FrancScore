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

function buildWritingSupabaseStub() {
  const prompt = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Argue for remote work",
    prompt: "Write a formal response about remote work.",
    criteria: ["Structure", "Vocabulary"],
    word_limit_min: 80,
    word_limit_max: 200,
  };
  const submission = {
    id: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-05-05T09:00:00.000Z",
  };
  const updatePayloads: unknown[] = [];

  return {
    prompt,
    submission,
    updatePayloads,
    client: {
      from(table: string) {
        if (table === "writing_prompts") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: prompt, error: null }),
              }),
            }),
          };
        }

        if (table === "writing_submissions") {
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

describe("writing submission flow", () => {
  beforeEach(() => {
    mockGetAuthContext.mockResolvedValue({ user: { id: "user-1" }, profile: { role: "USER" } });
    mockApplyXpAndStreak.mockResolvedValue(null);
    mockGenerateStructuredObject.mockReset();
    mockRunSafetyCheck.mockReset();
    mockIsNvidiaEnabled.mockReturnValue(false);
  });

  it("saves a submission and returns fallback feedback when AI is disabled", async () => {
    const supabase = buildWritingSupabaseStub();
    mockCreateClient.mockResolvedValue(supabase.client);
    mockCreateAdminClient.mockReturnValue(supabase.client);

    const { POST } = await import("@/app/api/ai/writing-evaluate/route");
    const response = await POST(
      new Request("http://localhost/api/ai/writing-evaluate", {
        method: "POST",
        body: JSON.stringify({
          prompt_id: supabase.prompt.id,
          submission_text:
            "Je pense que le teletravail offre beaucoup de flexibilite pour les employes et les entreprises. Dans mon experience, il permet de mieux organiser la journee, de reduire le temps de transport et de maintenir une meilleure concentration sur les taches prioritaires. Cependant, il faut aussi mettre en place des regles claires, des reunions utiles et une communication reguliere pour eviter l isolement, les malentendus et la baisse de motivation dans une equipe distante. De plus, les managers doivent suivre les objectifs de facon transparente, encourager la collaboration et proposer des moments d echange informels afin de proteger la cohesion du groupe sur le long terme.",
        }),
      }),
    );

    const payload = (await response.json()) as {
      status: string;
      source: string;
      submissionId: string;
      feedback: { score20: number | null; b2Rewrite?: string };
    };

    expect(response.status).toBe(200);
    expect(payload.status).toBe("reviewed");
    expect(payload.source).toBe("fallback");
    expect(payload.submissionId).toBe(supabase.submission.id);
    expect(payload.feedback.score20).not.toBeNull();
    expect(supabase.updatePayloads[0]).toMatchObject({
      status: "reviewed",
    });
    expect(mockApplyXpAndStreak).toHaveBeenCalledTimes(1);
  });
});
