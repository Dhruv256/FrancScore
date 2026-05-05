import { describe, expect, it, vi } from "vitest";

const mockGetAuthContext = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: mockGetAuthContext,
  getProfileDisplayName: vi.fn(() => "Test User"),
  isOnboardingComplete: vi.fn((profile) =>
    Boolean(
      profile?.onboarding_completed &&
        profile?.full_name &&
        profile?.target_exam &&
        profile?.target_level &&
        profile?.current_level_self_assessment &&
        profile?.weakest_skill &&
        profile?.daily_time_minutes,
    ),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => null,
}));

vi.mock("@/components/admin/AdminSidebar", () => ({
  AdminSidebar: () => null,
}));

describe("auth redirect logic", () => {
  it("redirects guests away from the protected app layout", async () => {
    mockGetAuthContext.mockResolvedValue({ user: null, profile: null });
    const appLayout = await import("@/app/(app)/layout");

    await expect(appLayout.default({ children: null })).rejects.toThrow(
      "REDIRECT:/auth/login",
    );
  });

  it("redirects incomplete users to onboarding", async () => {
    mockGetAuthContext.mockResolvedValue({
      user: { id: "user-1" },
      profile: {
        onboarding_completed: false,
        full_name: "Test User",
        target_exam: null,
        target_level: null,
        current_level_self_assessment: null,
        weakest_skill: null,
        daily_time_minutes: null,
      },
    });
    const appLayout = await import("@/app/(app)/layout");

    await expect(appLayout.default({ children: null })).rejects.toThrow(
      "REDIRECT:/onboarding",
    );
  });

  it("redirects non-admin users away from admin pages", async () => {
    mockGetAuthContext.mockResolvedValue({
      user: { id: "user-1" },
      profile: {
        onboarding_completed: true,
        full_name: "Test User",
        target_exam: "TEF_CANADA",
        target_level: "B2",
        current_level_self_assessment: "B1_PLUS",
        weakest_skill: "LISTENING",
        daily_time_minutes: 30,
        role: "USER",
      },
    });
    const adminLayout = await import("@/app/admin/layout");

    await expect(adminLayout.default({ children: null })).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });
});
