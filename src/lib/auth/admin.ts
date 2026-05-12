import "server-only";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin-email";
import type { Profile } from "@/lib/auth/resolve-auth-state";
import type { User } from "@supabase/supabase-js";

export { isAdminEmail };

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { profile } = await getAuthContext();
  return profile;
}

export async function requireAdmin(): Promise<{ user: User; profile: Profile }> {
  const { user, profile } = await getAuthContext();

  if (!user) {
    throw new AdminAuthError("Authentication required.", 401);
  }

  if (!profile || profile.role !== "ADMIN") {
    throw new AdminAuthError("Admin access required.", 403);
  }

  return { user, profile };
}

export async function requireAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 401) {
      redirect("/auth/login");
    }
    redirect("/dashboard");
  }
}

export function getAdminAuthErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return {
      status: error.status,
      body: { error: error.message },
    };
  }

  return null;
}
