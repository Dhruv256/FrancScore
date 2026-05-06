import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthContext = {
  user: User | null;
  profile: ProfileRow | null;
};

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const authState = await resolveAuthState();

  if (authState.status === "anonymous") {
    return {
      user: null,
      profile: null,
    };
  }

  return {
    user: authState.user,
    profile: authState.status === "needs_profile" ? null : authState.profile,
  };
});

export function isOnboardingComplete(profile: ProfileRow | null): boolean {
  if (!profile) {
    return false;
  }

  return profile.onboarding_completed;
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
