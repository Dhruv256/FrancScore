import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const authState = await resolveAuthState();

  if (authState.status === "ready") {
    redirect("/dashboard");
  }

  if (authState.status === "needs_onboarding" || authState.status === "needs_profile") {
    redirect("/onboarding");
  }

  return <SignupForm />;
}
