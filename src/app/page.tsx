"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  FileCheck,
  Headphones,
  Layers,
  Mic,
  PenTool,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Zap,
} from "lucide-react";

const modules = [
  { title: "Listening Lab", icon: Headphones, metric: "Trap drills", tint: "text-skill-listening" },
  { title: "Reading Lab", icon: BookOpen, metric: "Passage logic", tint: "text-skill-reading" },
  { title: "Writing Coach", icon: PenTool, metric: "B2 rewrites", tint: "text-skill-writing" },
  { title: "Speaking Coach", icon: Mic, metric: "Fluency review", tint: "text-skill-speaking" },
  { title: "Flashcards", icon: Layers, metric: "Spaced recall", tint: "text-brand-green" },
  { title: "Mock Tests", icon: FileCheck, metric: "Exam simulator", tint: "text-accent-blue" },
];

const stats = [
  { value: "B2", label: "readiness target" },
  { value: "4", label: "exam skills" },
  { value: "AI", label: "coach feedback" },
  { value: "7d", label: "repair plans" },
];

const flow = [
  "Find the weakest trap",
  "Drill with timed pressure",
  "Review the correction",
  "Repair the score gap",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <nav className="fixed inset-x-0 top-0 z-50 px-3 py-3">
        <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-3 sm:px-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full gradient-green text-sm font-black text-text-inverse shadow-[0_0_34px_rgba(184,255,56,0.28)]">
              F
            </div>
            <span className="text-base font-black">
              Franc<span className="gradient-text-green">Score</span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <a href="#product" className="text-sm font-medium text-text-secondary hover:text-text-primary">
              Product
            </a>
            <a href="#modules" className="text-sm font-medium text-text-secondary hover:text-text-primary">
              Modules
            </a>
            <a href="#method" className="text-sm font-medium text-text-secondary hover:text-text-primary">
              Method
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="btn btn-ghost hidden sm:inline-flex">
              Log in
            </Link>
            <Link href="/auth/signup" className="btn btn-primary">
              Start
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="cinematic-bg px-4 pb-14 pt-24 sm:px-6 lg:pb-24">
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:min-h-[760px] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-7 pt-8">
            <div className="page-kicker">
              <Sparkles className="h-4 w-4" />
              Strict AI coaching for TEF and TCF Canada
            </div>

            <div className="space-y-5">
              <h1 className="display-title max-w-4xl text-[4.15rem] sm:text-[6rem] lg:text-[7.4rem]">
                Train like B2 is inevitable.
              </h1>
              <p className="max-w-xl text-base leading-7 text-text-secondary sm:text-lg">
                FrancScore turns French exam prep into a daily command center:
                trap-aware drills, AI review, flashcards, mocks, and one iconic
                readiness score.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup" className="btn btn-primary btn-lg">
                Build my B2 plan
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/auth/login" className="btn btn-secondary btn-lg">
                <Play className="h-5 w-5" />
                Open dashboard
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="surface-panel rounded-2xl p-4">
                  <div className="text-2xl font-black gradient-text-green">{stat.value}</div>
                  <div className="mt-1 text-xs font-medium text-text-muted">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div id="product" className="relative min-h-[620px]">
            <div className="hero-visual absolute inset-x-0 top-3 mx-auto h-[520px] max-w-[440px] rounded-[2.8rem] border border-white/15 shadow-[0_40px_140px_rgba(0,0,0,0.55)] sm:h-[600px]" />
            <div className="mobile-frame absolute bottom-0 left-1/2 w-[min(92vw,360px)] -translate-x-1/2 p-4 animate-float">
              <div className="rounded-[1.8rem] bg-[#090d11] p-4">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-text-muted">B2 Readiness</div>
                    <div className="text-5xl font-black gradient-text-green">78</div>
                  </div>
                  <div className="grid h-16 w-16 place-items-center rounded-full border border-brand-green/25 bg-brand-green/10">
                    <Target className="h-7 w-7 text-brand-green" />
                  </div>
                </div>
                <div className="space-y-3">
                  {["Listening", "Reading", "Writing", "Speaking"].map((skill, index) => (
                    <div key={skill} className="rounded-2xl bg-white/[0.055] p-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-bold">{skill}</span>
                        <span className="text-text-muted">{72 + index * 5}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill progress-fill-green" style={{ width: `${72 + index * 5}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="surface-panel absolute right-0 top-20 hidden w-48 rounded-3xl p-4 sm:block">
              <div className="flex items-center gap-2 text-sm font-black">
                <Zap className="h-4 w-4 text-brand-green" />
                +145 XP
              </div>
              <p className="mt-2 text-xs leading-5 text-text-muted">Today&apos;s trap drills completed.</p>
            </div>
            <div className="surface-panel absolute bottom-24 left-0 hidden w-52 rounded-3xl p-4 sm:block">
              <div className="flex items-center gap-2 text-sm font-black">
                <ShieldCheck className="h-4 w-4 text-accent-cyan" />
                Negation trap repaired
              </div>
              <p className="mt-2 text-xs leading-5 text-text-muted">Accuracy improved by 18% this week.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="px-4 py-14 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="page-kicker mb-4">
                <Brain className="h-4 w-4" />
                One cockpit for every skill
              </div>
              <h2 className="max-w-2xl text-4xl font-black leading-none sm:text-6xl">
                Every screen feels like progress.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-text-secondary">
              Each lab has a focused personality, but the rhythm stays the same:
              practice, score, explain, repair.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <Link
                key={module.title}
                href={index < 2 ? `/practice/${module.title.split(" ")[0].toLowerCase()}` : "/auth/signup"}
                className="card group min-h-52 overflow-hidden p-5"
              >
                <div className="absolute inset-x-0 top-0 h-px gradient-green opacity-60" />
                <div className="flex items-start justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.07]">
                    <module.icon className={`h-6 w-6 ${module.tint}`} />
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand-green" />
                </div>
                <div className="mt-10">
                  <div className="text-2xl font-black">{module.title}</div>
                  <div className="mt-2 text-sm text-text-muted">{module.metric}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="method" className="px-4 py-14 sm:px-6 lg:py-24">
        <div className="surface-panel mx-auto max-w-6xl overflow-hidden rounded-[2rem] p-5 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="page-kicker mb-5">
                <Timer className="h-4 w-4" />
                The FrancScore loop
              </div>
              <h2 className="text-4xl font-black leading-none sm:text-6xl">
                Disciplined prep, not random practice.
              </h2>
              <p className="mt-5 text-sm leading-6 text-text-secondary">
                FrancScore behaves like an elite coach: it finds the weak area,
                gives you the right repetition, then proves whether the weakness
                is actually moving.
              </p>
            </div>
            <div className="grid gap-3">
              {flow.map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.055] p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full gradient-green text-sm font-black text-text-inverse">
                    {index + 1}
                  </div>
                  <div className="font-black">{item}</div>
                  <CheckCircle2 className="ml-auto h-5 w-5 text-brand-green" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-8 sm:px-6 lg:pb-24">
        <div className="mx-auto grid max-w-6xl gap-3 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <Award className="h-6 w-6 text-accent-amber" />
              <h2 className="text-3xl font-black">Gamified, but grown up.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">
              XP, streaks, badges, and weakness quests are presented like a
              serious performance system. Motivating, never childish.
            </p>
          </div>
          <div className="card p-6">
            <BarChart3 className="mb-8 h-8 w-8 text-brand-green" />
            <div className="text-5xl font-black gradient-text-green">CLB 7+</div>
            <p className="mt-3 text-sm text-text-muted">The daily target stays visible.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="font-black text-text-primary">FrancScore</div>
          <div>Built for disciplined TEF and TCF Canada preparation.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-text-primary">Privacy</a>
            <a href="#" className="hover:text-text-primary">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
