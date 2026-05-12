import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isAdminEmail } from "@/lib/auth/admin-email";
import { isE2ETestModeEnabled } from "@/lib/env/server";
import { formatSupabaseError } from "@/lib/errors/supabase-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthState =
  | { status: "anonymous" }
  | {
      status: "needs_profile";
      user: User;
      userId: string;
      email: string | null;
      error: string | null;
    }
  | { status: "needs_onboarding"; user: User; userId: string; profile: Profile }
  | { status: "ready"; user: User; userId: string; profile: Profile };

export const resolveAuthState = cache(async (): Promise<AuthState> => {
  const testState = await getTestAuthState();
  if (testState) {
    return testState;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "anonymous" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    return profile.onboarding_completed
      ? { status: "ready", user, userId: user.id, profile }
      : { status: "needs_onboarding", user, userId: user.id, profile };
  }

  const ensuredProfile = await ensureProfileForUser(user, profileError?.message ?? null);

  if (!ensuredProfile.profile) {
    return {
      status: "needs_profile",
      user,
      userId: user.id,
      email: user.email ?? null,
      error: ensuredProfile.error,
    };
  }

  return ensuredProfile.profile.onboarding_completed
    ? { status: "ready", user, userId: user.id, profile: ensuredProfile.profile }
    : {
        status: "needs_onboarding",
        user,
        userId: user.id,
        profile: ensuredProfile.profile,
      };
});

async function ensureProfileForUser(
  user: User,
  readError: string | null,
): Promise<{ profile: Profile | null; error: string | null }> {
  try {
    const admin = createAdminClient();

    const { data: existingProfile, error: adminReadError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile) {
      if (isAdminEmail(user.email) && existingProfile.role !== "ADMIN") {
        const { data: promotedProfile, error: promoteError } = await admin
          .from("profiles")
          .update({ role: "ADMIN" })
          .eq("id", user.id)
          .select("*")
          .single();

        if (promoteError) {
          const formatted = formatSupabaseError(promoteError, {
            operation: "promote profile during auth bootstrap",
            table: "public.profiles",
            env: "server",
          });
          return { profile: null, error: formatted.userMessage };
        }

        return { profile: promotedProfile, error: null };
      }

      return { profile: existingProfile, error: null };
    }

    if (adminReadError) {
      const formatted = formatSupabaseError(adminReadError, {
        operation: "read profile during auth bootstrap",
        table: "public.profiles",
        env: "server",
      });
      return { profile: null, error: formatted.userMessage };
    }

    const { data, error } = await admin
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
          role: isAdminEmail(user.email) ? "ADMIN" : "USER",
          onboarding_completed: false,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) {
      const formatted = formatSupabaseError(error, {
        operation: "upsert profile during auth bootstrap",
        table: "public.profiles",
        env: "server",
      });
      return { profile: null, error: formatted.userMessage };
    }

    return { profile: data, error: null };
  } catch (error) {
    const formatted = formatSupabaseError(error, {
      operation: "create profile during auth bootstrap",
      table: "public.profiles",
      env: "server",
    });
    return {
      profile: null,
      error: readError ? `${readError}; ${formatted.userMessage}` : formatted.userMessage,
    };
  }
}

async function getTestAuthState(): Promise<AuthState | null> {
  if (!isE2ETestModeEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const mode = cookieStore.get("francscore-test-auth")?.value ?? "guest";

  if (mode === "guest") {
    return { status: "anonymous" };
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

  const baseProfile: Profile = {
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
      status: "needs_onboarding",
      user,
      userId,
      profile: baseProfile,
    };
  }

  if (mode === "admin") {
    return {
      status: "ready",
      user,
      userId,
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
      status: "ready",
      user,
      userId,
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

  return { status: "anonymous" };
}
