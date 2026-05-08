"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { formatSupabaseError } from "@/lib/errors/supabase-error";
import { createClient } from "@/lib/supabase/client";
import { AddToHomeScreenPrompt } from "@/components/pwa/AddToHomeScreenPrompt";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const formatted = formatSupabaseError(error, {
        operation: "sign in",
        env: "client",
      });
      setErrorMessage(formatted.userMessage);
      setIsSubmitting(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="cinematic-bg grid min-h-dvh place-items-center p-4 sm:p-6">
      <div className="relative z-10 grid w-full max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hero-visual hidden min-h-[680px] rounded-[2rem] border border-white/10 shadow-[0_40px_140px_rgba(0,0,0,0.5)] lg:block" />

        <div className="surface-panel flex min-h-[680px] flex-col justify-center rounded-[2rem] p-5 sm:p-8">
          <Link href="/" className="mb-10 flex items-center gap-2">
            <div className="grid h-11 w-11 place-items-center rounded-full gradient-green text-base font-black text-text-inverse shadow-[0_0_30px_rgba(182,197,111,0.22)]">
              F
            </div>
            <span className="text-2xl font-black">
              Franc<span className="gradient-text-green">Score</span>
            </span>
          </Link>

          <div className="mb-8">
            <div className="page-kicker mb-4">
              <ShieldCheck className="h-4 w-4" />
              Secure exam cockpit
            </div>
            <h1 className="display-title text-5xl sm:text-6xl">Welcome back.</h1>
            <p className="mt-4 text-sm leading-6 text-text-secondary">
              Return to your readiness score, daily repair missions, and AI coach.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-text-secondary">Email</span>
              <span className="relative block">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-text-secondary">Password</span>
              <span className="relative block">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border-default" />
            <span className="text-xs font-bold text-text-muted">or</span>
            <div className="h-px flex-1 bg-border-default" />
          </div>

          <button className="btn btn-secondary w-full" type="button" disabled>
            <Sparkles className="h-4 w-4" />
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-black text-brand-green hover:underline">
              Sign up free
            </Link>
          </p>
          <div className="mt-5">
            <AddToHomeScreenPrompt compact />
          </div>
        </div>
      </div>
    </div>
  );
}
