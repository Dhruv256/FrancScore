import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { resolveAuthState } from "@/lib/auth/resolve-auth-state";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const authState = await resolveAuthState();

  if (authState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (authState.status === "ready") {
    redirect("/dashboard");
  }

  if (authState.status === "needs_profile") {
    return (
      <div className="cinematic-bg grid min-h-dvh place-items-center p-4">
        <div className="surface-panel max-w-lg rounded-[2rem] p-6 text-center">
          <p className="page-kicker mb-4 justify-center">Profile setup paused</p>
          <h1 className="text-3xl font-black text-text-primary">We could not finish profile setup.</h1>
          <p className="mt-4 text-sm leading-6 text-text-secondary">
            Your login session is valid, but FrancScore could not create your profile row yet.
            Please refresh once, or check the server Supabase service-role configuration.
          </p>
          {authState.error ? (
            <p className="mt-4 rounded-2xl border border-accent-rose/25 bg-accent-rose/10 p-3 text-left text-xs text-accent-rose">
              {authState.error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return <OnboardingForm profile={authState.profile} />;
}
