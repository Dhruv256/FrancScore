import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const authState = await resolveAuthState();

  if (authState.status === "ready") {
    redirect("/dashboard");
  }

  if (authState.status === "needs_onboarding" || authState.status === "needs_profile") {
    redirect("/onboarding");
  }

  return <LoginForm />;
}
