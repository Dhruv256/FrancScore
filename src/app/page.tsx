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
  Flame,
  Headphones,
  Layers,
  Mic,
  PenTool,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AddToHomeScreenPrompt } from "@/components/pwa/AddToHomeScreenPrompt";

const showcasePhones = [
  {
    title: "Dashboard",
    label: "B2 readiness",
    icon: Target,
    tone: "orange",
    rows: ["Listening repair", "Writing feedback", "Flashcards"],
  },
  {
    title: "Flashcards",
    label: "Spaced recall",
    icon: Layers,
    tone: "cream",
    rows: ["pourtant", "however / yet", "contrast connector"],
  },
  {
    title: "Listening Lab",
    label: "Trap practice",
    icon: Headphones,
    tone: "dark",
    rows: ["negation", "numbers", "contrast markers"],
  },
  {
    title: "Writing Coach",
    label: "AI correction",
    icon: PenTool,
    tone: "cream",
    rows: ["task response", "B2 rewrite", "next drill"],
  },
  {
    title: "Mock Results",
    label: "Exam replay",
    icon: FileCheck,
    tone: "dark",
    rows: ["skill split", "repair plan", "timed review"],
  },
  {
    title: "Progress",
    label: "Profile",
    icon: BarChart3,
    tone: "mint",
    rows: ["XP", "streaks", "badges"],
  },
];

const features = [
  {
    title: "AI Writing Correction",
    text: "Get structured French feedback, score estimates, grammar notes, and B2 rewrites.",
    icon: PenTool,
  },
  {
    title: "Speaking Coach",
    text: "Practice oral responses with transcript-based fluency and structure feedback.",
    icon: Mic,
  },
  {
    title: "Unlimited Flashcards",
    text: "Review real TEF/TCF vocabulary with weak-word and connector decks.",
    icon: Layers,
  },
  {
    title: "Listening Trap Practice",
    text: "Train negation, number, date, contrast, and false-friend traps.",
    icon: Headphones,
  },
  {
    title: "TEF/TCF Mock Tests",
    text: "Run compact simulations that turn mistakes into a repair plan.",
    icon: FileCheck,
  },
  {
    title: "B2 Readiness Score",
    text: "Track skill movement from real attempts, submissions, reviews, and progress snapshots.",
    icon: TrendingUp,
  },
];

const examModes = [
  {
    title: "TEF Canada",
    text: "Focused mode for TEF-style writing, speaking, listening, and reading drills.",
    icon: ShieldCheck,
  },
  {
    title: "TCF Canada",
    text: "Practice TCF-style prompts, comprehension traps, and timed exam rhythm.",
    icon: BookOpen,
  },
  {
    title: "Mixed Mode",
    text: "Blend both formats when your goal is practical B2 control across contexts.",
    icon: Brain,
  },
];

const gamification = [
  { label: "XP", icon: Zap },
  { label: "Streaks", icon: Flame },
  { label: "Badges", icon: Award },
  { label: "Weakness quests", icon: Target },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg-primary text-text-primary">
      <nav className="fixed inset-x-0 top-0 z-50 px-3 py-3">
        <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-3 sm:px-5">
          <Link href="/" className="flex items-center gap-2" aria-label="FrancScore home">
            <div className="grid h-9 w-9 place-items-center rounded-full gradient-orange text-sm font-black text-text-primary shadow-[0_12px_26px_rgba(255,122,26,0.24)]">
              F
            </div>
            <span className="text-base font-black text-text-primary">
              Franc<span className="text-brand-green">Score</span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <a href="#showcase" className="text-sm font-bold text-text-muted hover:text-text-primary">
              App
            </a>
            <a href="#features" className="text-sm font-bold text-text-muted hover:text-text-primary">
              Features
            </a>
            <a href="#exams" className="text-sm font-bold text-text-muted hover:text-text-primary">
              Exams
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

      <section className="surface-editorial px-4 pb-10 pt-24 sm:px-6 lg:pb-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:min-h-[760px] lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-7">
            <div className="page-kicker">
              <Sparkles className="h-4 w-4" />
              Premium TEF/TCF Canada prep
            </div>

            <div className="space-y-5">
              <h1 className="display-title max-w-3xl text-[3.65rem] text-text-primary sm:text-[5.5rem] lg:text-[6.5rem]">
                French exam prep in your pocket.
              </h1>
              <p className="max-w-xl text-base leading-7 text-text-secondary sm:text-lg">
                FrancScore blends an AI exam coach, B2 readiness tracking, flashcards,
                mock tests, writing correction, and listening trap drills into one
                polished mobile-first study app.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup" className="btn btn-primary btn-lg">
                Build my study plan
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/auth/login" className="btn btn-secondary btn-lg">
                Open app
              </Link>
            </div>
            <AddToHomeScreenPrompt compact />
          </div>

          <div className="relative min-h-[640px]">
            <div className="absolute left-1/2 top-0 h-[610px] w-[min(78vw,290px)] -translate-x-[82%] rotate-[-5deg] phone-frame p-3 max-sm:hidden">
              <PhonePreview phone={showcasePhones[1]} compact />
            </div>
            <div className="absolute left-1/2 top-10 h-[620px] w-[min(82vw,310px)] -translate-x-1/2 phone-frame p-3">
              <PhonePreview phone={showcasePhones[0]} hero />
            </div>
            <div className="absolute left-1/2 top-4 h-[600px] w-[min(74vw,280px)] translate-x-[12%] rotate-[5deg] phone-frame p-3 max-md:hidden">
              <PhonePreview phone={showcasePhones[2]} compact />
            </div>
          </div>
        </div>
      </section>

      <section id="showcase" className="px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="page-kicker mb-4">
                <Timer className="h-4 w-4" />
                Mobile app showcase
              </div>
              <h2 className="max-w-2xl text-4xl font-black leading-none sm:text-6xl">
                Six focused screens. One exam rhythm.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-text-secondary">
              These are visual product previews, not database-backed user stats.
              The real app uses Supabase content and empty states when content is missing.
            </p>
          </div>

          <div className="mobile-showcase-grid">
            {showcasePhones.map((phone) => (
              <div key={phone.title} className="phone-frame aspect-[9/18.5] p-2">
                <PhonePreview phone={phone} compact />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <div className="page-kicker mb-4">
              <Brain className="h-4 w-4" />
              AI coach plus daily practice
            </div>
            <h2 className="max-w-2xl text-4xl font-black leading-none sm:text-6xl">
              Built for learners who need proof of progress.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="card-soft min-h-56 p-5">
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green-bg text-brand-green">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="exams" className="px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
            <div className="surface-panel p-6 sm:p-8">
              <div className="page-kicker mb-5">
                <BookOpen className="h-4 w-4" />
                Exam modes
              </div>
              <h2 className="text-4xl font-black leading-none sm:text-5xl">
                Train for TEF, TCF, or both.
              </h2>
              <p className="mt-5 text-sm leading-6 text-text-secondary">
                Keep the route specific when you need it, or mix formats to build
                broad French control for Canada-focused exam tasks.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {examModes.map((mode) => (
                <article key={mode.title} className="card-soft p-5">
                  <mode.icon className="mb-8 h-7 w-7 text-brand-green" />
                  <h3 className="text-xl font-black">{mode.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{mode.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-phone rounded-[2.25rem] p-6 sm:p-8">
            <div className="page-kicker mb-6 border-white/15 bg-white/10 text-[#ffb26a]">
              <Award className="h-4 w-4" />
              Gamification that still feels grown up
            </div>
            <h2 className="max-w-2xl text-4xl font-black leading-none text-text-inverse sm:text-6xl">
              Daily energy, serious exam signal.
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {gamification.map((item) => (
                <div key={item.label} className="rounded-[1.45rem] border border-white/10 bg-white/[0.07] p-4">
                  <item.icon className="mb-5 h-6 w-6 text-brand-green" />
                  <div className="font-black text-text-inverse">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-soft p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-black text-text-muted">B2 readiness</span>
              <span className="badge badge-green">live score</span>
            </div>
            <div className="text-7xl font-black text-brand-green">B2</div>
            <p className="mt-5 text-sm leading-6 text-text-secondary">
              Readiness is calculated from real attempts, writing and speaking
              submissions, flashcard reviews, mocks, and progress snapshots.
            </p>
            <div className="mt-8 space-y-3">
              {["Listening", "Reading", "Writing", "Speaking"].map((skill, index) => (
                <div key={skill}>
                  <div className="mb-2 flex items-center justify-between text-xs font-bold text-text-muted">
                    <span>{skill}</span>
                    <span>{index === 0 ? "repairing" : "tracked"}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill progress-fill-green" style={{ width: `${64 + index * 7}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-8 sm:px-6 lg:pb-24">
        <div className="surface-panel mx-auto grid max-w-6xl gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="max-w-2xl text-4xl font-black leading-none sm:text-5xl">
              Make the next study session feel inevitable.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-text-secondary">
              Create your profile, choose your exam path, and let FrancScore
              route you into live Supabase-backed practice.
            </p>
          </div>
          <Link href="/auth/signup" className="btn btn-primary btn-lg">
            Start FrancScore
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function PhonePreview({
  phone,
  hero = false,
  compact = false,
}: {
  phone: (typeof showcasePhones)[number];
  hero?: boolean;
  compact?: boolean;
}) {
  const Icon = phone.icon;
  const isLight = phone.tone === "cream" || phone.tone === "mint";

  return (
    <div
      className={`h-full rounded-[1.9rem] p-4 ${
        isLight
          ? "bg-[linear-gradient(145deg,#f7f2e8,#dde5e1)] text-text-primary"
          : "surface-phone"
      }`}
    >
      <div className="mt-5 flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-green text-text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className={`h-2 w-12 rounded-full ${isLight ? "bg-black/10" : "bg-white/15"}`} />
      </div>

      <div className={hero ? "mt-10" : "mt-8"}>
        <div className={`text-xs font-black ${isLight ? "text-text-muted" : "text-[#a8a096]"}`}>
          {phone.label}
        </div>
        <h3 className={`${hero ? "text-4xl" : compact ? "text-xl" : "text-3xl"} mt-2 font-black leading-none`}>
          {phone.title}
        </h3>
      </div>

      <div className="mt-7 space-y-3">
        {phone.rows.map((row, index) => (
          <div
            key={row}
            className={`rounded-[1.2rem] p-3 ${
              isLight ? "bg-white/55 shadow-[0_10px_22px_rgba(17,17,17,0.06)]" : "bg-white/[0.075]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-brand-green" />
              <div className="min-w-0 flex-1 text-sm font-bold">{row}</div>
              {index === 0 ? <CheckCircle2 className="h-4 w-4 text-brand-green" /> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className={isLight ? "progress-bar" : "progress-bar border-white/10 bg-white/10"}>
          <div className="progress-fill progress-fill-green" style={{ width: hero ? "78%" : "64%" }} />
        </div>
      </div>
    </div>
  );
}
