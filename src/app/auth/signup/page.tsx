import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { getAuthContext, isOnboardingComplete } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const { user, profile } = await getAuthContext();

  if (user) {
    redirect(isOnboardingComplete(profile) ? "/dashboard" : "/onboarding");
  }

  return <SignupForm />;
}
