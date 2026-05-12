import "server-only";

import { getServerEnv } from "@/lib/env/server";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  return getAdminEmails().has(normalizedEmail);
}

function getAdminEmails() {
  const env = getServerEnv();
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}
