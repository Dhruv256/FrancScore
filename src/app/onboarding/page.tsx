import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getAuthContext, isOnboardingComplete } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/auth/login");
  }

  if (isOnboardingComplete(profile)) {
    redirect("/dashboard");
  }

  if (!profile) {
    redirect("/auth/login");
  }

  return <OnboardingForm profile={profile} />;
}
