import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthContext = {
  user: User | null;
  profile: ProfileRow | null;
};

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const testContext = await getTestAuthContext();
  if (testContext) {
    return testContext;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    return {
      user,
      profile,
    };
  }

  const { data: ensuredProfile } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name:
          user.user_metadata.full_name ??
          user.user_metadata.name ??
          user.email?.split("@")[0] ??
          "FrancScore Learner",
      },
      {
        onConflict: "id",
      },
    )
    .select("*")
    .single();

  return {
    user,
    profile: ensuredProfile ?? null,
  };
});

async function getTestAuthContext(): Promise<AuthContext | null> {
  if (process.env.FRANCSCORE_E2E_TEST_MODE !== "1") {
    return null;
  }

  const cookieStore = await cookies();
  const mode = cookieStore.get("francscore-test-auth")?.value ?? "guest";

  if (mode === "guest") {
    return { user: null, profile: null };
  }

  const userId = "00000000-0000-0000-0000-000000000001";
  const now = "2026-05-05T00:00:00.000Z";
  const user = {
    id: userId,
    app_metadata: {},
    user_metadata: {
      full_name: "E2E Learner",
    },
    aud: "authenticated",
    created_at: now,
    email: "e2e@francscore.test",
  } as User;

  const baseProfile: ProfileRow = {
    id: userId,
    avatar_url: null,
    created_at: now,
    current_level_self_assessment: null,
    current_streak: 4,
    daily_time_minutes: null,
    email: "e2e@francscore.test",
    exam_date: null,
    full_name: "E2E Learner",
    longest_streak: 7,
    onboarding_completed: false,
    role: "USER",
    target_exam: null,
    target_level: null,
    total_xp: 120,
    updated_at: now,
    weakest_skill: null,
  };

  if (mode === "onboarding") {
    return {
      user,
      profile: {
        ...baseProfile,
        full_name: "E2E Learner",
      },
    };
  }

  if (mode === "admin") {
    return {
      user,
      profile: {
        ...baseProfile,
        onboarding_completed: true,
        target_exam: "TEF_CANADA",
        target_level: "B2",
        current_level_self_assessment: "B1_PLUS",
        weakest_skill: "LISTENING",
        daily_time_minutes: 45,
        role: "ADMIN",
      },
    };
  }

  if (mode === "dashboard") {
    return {
      user,
      profile: {
        ...baseProfile,
        onboarding_completed: true,
        target_exam: "TEF_CANADA",
        target_level: "B2",
        current_level_self_assessment: "B1_PLUS",
        weakest_skill: "LISTENING",
        daily_time_minutes: 45,
      },
    };
  }

  return { user: null, profile: null };
}

export function isOnboardingComplete(profile: ProfileRow | null): boolean {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.onboarding_completed &&
      profile.full_name &&
      profile.target_exam &&
      profile.target_level &&
      profile.current_level_self_assessment &&
      profile.weakest_skill &&
      profile.daily_time_minutes,
  );
}

export function getProfileDisplayName(
  profile: ProfileRow | null,
  user: User | null,
): string {
  return (
    profile?.full_name ||
    user?.user_metadata.full_name ||
    user?.email?.split("@")[0] ||
    "FrancScore Learner"
  );
}
