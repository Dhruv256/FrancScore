"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, name } },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.user && data.session) {
      await supabase.from("profiles").upsert(
        { id: data.user.id, email, full_name: name },
        { onConflict: "id" },
      );

      router.replace("/onboarding");
      router.refresh();
      return;
    }

    setSuccessMessage(
      "Your account has been created. Check your email to confirm it, then sign in to continue onboarding.",
    );
    setIsSubmitting(false);
  };

  return (
    <div className="cinematic-bg grid min-h-dvh place-items-center p-4 sm:p-6">
      <div className="relative z-10 grid w-full max-w-6xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-panel flex min-h-[700px] flex-col justify-center rounded-[2rem] p-5 sm:p-8">
          <Link href="/" className="mb-10 flex items-center gap-2">
            <div className="grid h-11 w-11 place-items-center rounded-full gradient-green text-base font-black text-text-inverse shadow-[0_0_34px_rgba(184,255,56,0.25)]">
              F
            </div>
            <span className="text-2xl font-black">
              Franc<span className="gradient-text-green">Score</span>
            </span>
          </Link>

          <div className="mb-8">
            <div className="page-kicker mb-4">
              <Sparkles className="h-4 w-4" />
              Start the B2 operating system
            </div>
            <h1 className="display-title text-5xl sm:text-6xl">Build your plan.</h1>
            <p className="mt-4 text-sm leading-6 text-text-secondary">
              Create your account and FrancScore will route you into a focused onboarding flow.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField label="Full Name" icon={<User className="h-4 w-4" />}>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input pl-10"
                placeholder="Your full name"
                required
                autoComplete="name"
              />
            </AuthField>

            <AuthField label="Email" icon={<Mail className="h-4 w-4" />}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input pl-10"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </AuthField>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-text-secondary">Password</span>
              <span className="relative block">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-text-muted hover:bg-white/10 hover:text-text-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {errorMessage ? (
              <p className="rounded-2xl border border-accent-rose/25 bg-accent-rose/10 p-3 text-sm text-accent-rose">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="rounded-2xl border border-brand-green/25 bg-brand-green/10 p-3 text-sm text-brand-green">
                {successMessage}
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-black text-brand-green hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <div className="hero-visual hidden min-h-[700px] rounded-[2rem] border border-white/10 shadow-[0_40px_140px_rgba(0,0,0,0.5)] lg:block" />
      </div>
    </div>
  );
}

function AuthField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-text-secondary">{label}</span>
      <span className="relative block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</span>
        {children}
      </span>
    </label>
  );
}
