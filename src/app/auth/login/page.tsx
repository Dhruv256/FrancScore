import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAuthContext, isOnboardingComplete } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const { user, profile } = await getAuthContext();

  if (user) {
    redirect(isOnboardingComplete(profile) ? "/dashboard" : "/onboarding");
  }

  return <LoginForm />;
}
