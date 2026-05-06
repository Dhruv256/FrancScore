"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  Clock3,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import {
  CURRENT_LEVEL_SELF_ASSESSMENTS,
  GOAL_LEVELS,
  EXAM_TYPES,
  SKILLS,
} from "@/lib/constants";
import { formatSupabaseError } from "@/lib/errors/supabase-error";
import type {
  CurrentLevelSelfAssessment,
  ExamType,
  GoalLevel,
  SkillType,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { formatCEFRLevel, formatExamType, formatGoalLevel, formatSkillType } from "@/lib/utils";

type OnboardingFormProps = {
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    target_exam: string | null;
    target_level: string | null;
    exam_date: string | null;
    current_level_self_assessment: string | null;
    weakest_skill: string | null;
    daily_time_minutes: number | null;
  };
};

const steps = [
  { title: "About You", description: "Set your name and target exam." },
  { title: "Target Goal", description: "Choose the score target you need." },
  { title: "Current Level", description: "Tell us where you are today." },
  { title: "Weakest Skill", description: "We will prioritize this in your plan." },
  { title: "Study Plan", description: "Set your exam date and daily time." },
  { title: "Ready!", description: "Your personalized prep journey is ready." },
] as const;

const studyTimeOptions = [15, 30, 45, 60, 90, 120] as const;

export function OnboardingForm({ profile }: OnboardingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [targetExam, setTargetExam] = useState<ExamType | "">(
    isExamType(profile.target_exam) ? profile.target_exam : "",
  );
  const [targetLevel, setTargetLevel] = useState<GoalLevel | "">(
    isGoalLevel(profile.target_level) ? profile.target_level : "",
  );
  const [examDate, setExamDate] = useState(profile.exam_date ?? "");
  const [currentLevelSelfAssessment, setCurrentLevelSelfAssessment] = useState<
    CurrentLevelSelfAssessment | ""
  >(
    isCurrentLevel(profile.current_level_self_assessment)
      ? profile.current_level_self_assessment
      : "",
  );
  const [weakestSkill, setWeakestSkill] = useState<SkillType | "">(
    isSkillType(profile.weakest_skill) ? profile.weakest_skill : "",
  );
  const [dailyTimeMinutes, setDailyTimeMinutes] = useState<number | null>(
    profile.daily_time_minutes,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceed =
    (currentStep === 0 && fullName.trim() && targetExam) ||
    (currentStep === 1 && targetLevel) ||
    (currentStep === 2 && currentLevelSelfAssessment) ||
    (currentStep === 3 && weakestSkill) ||
    (currentStep === 4 && dailyTimeMinutes) ||
    currentStep === 5;

  const handleFinish = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        target_exam: targetExam,
        target_level: targetLevel,
        exam_date: examDate || null,
        current_level_self_assessment: currentLevelSelfAssessment,
        weakest_skill: weakestSkill,
        daily_time_minutes: dailyTimeMinutes,
        onboarding_completed: true,
      })
      .eq("id", profile.id);

    if (error) {
      const formatted = formatSupabaseError(error, {
        operation: "save onboarding profile",
        table: "public.profiles",
        env: "client",
      });
      setErrorMessage(formatted.userMessage);
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        target_exam: targetExam,
      },
    });

    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="cinematic-bg flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <div className="relative z-10 grid w-full max-w-6xl gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="surface-panel hidden rounded-[2rem] p-6 lg:block">
          <div className="page-kicker mb-6">
            <Sparkles className="h-4 w-4" />
            Personalized B2 route
          </div>
          <h1 className="display-title text-6xl">Your prep cockpit.</h1>
          <p className="mt-5 text-sm leading-6 text-text-secondary">
            A few disciplined choices let FrancScore tune your daily quests,
            target exam pressure, and AI feedback loop.
          </p>
          <div className="hero-visual mt-8 h-80 rounded-[2rem] border border-white/10" />
        </aside>

        <div className="surface-panel rounded-[2rem] p-5 sm:p-8">
          <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-1">
          {steps.map((step, index) => (
            <div key={step.title} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                  index < currentStep
                    ? "gradient-green text-white"
                    : index === currentStep
                      ? "bg-brand-green/20 text-brand-green border border-brand-green/40"
                      : "bg-bg-card text-text-muted border border-border-default"
                }`}
              >
                {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={`w-8 md:w-12 h-0.5 ${
                    index < currentStep ? "bg-brand-green" : "bg-border-default"
                  }`}
                />
              ) : null}
            </div>
          ))}
        </div>

          <h2 className="text-4xl font-black text-center mb-2">
            {steps[currentStep].title}
          </h2>
          <p className="text-sm text-text-muted text-center mb-8">
            {steps[currentStep].description}
          </p>

          {currentStep === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-1.5 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="input pl-10"
                    placeholder="Your full name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                {EXAM_TYPES.map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => setTargetExam(exam)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                      targetExam === exam
                        ? "bg-brand-green/10 border-brand-green/40 text-text-primary"
                        : "bg-bg-input border-border-default text-text-secondary hover:border-border-strong"
                    }`}
                  >
                    <BookOpen
                      className={`w-5 h-5 ${
                        targetExam === exam ? "text-brand-green" : "text-text-muted"
                      }`}
                    />
                    <div>
                      <div className="font-medium">{formatExamType(exam)}</div>
                      <div className="text-xs text-text-muted">
                        {exam === "TEF_CANADA"
                          ? "Prepare for TEF Canada."
                          : exam === "TCF_CANADA"
                            ? "Prepare for TCF Canada."
                            : "Train across both exam formats."}
                      </div>
                    </div>
                    {targetExam === exam ? (
                      <Check className="w-5 h-5 text-brand-green ml-auto" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {GOAL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setTargetLevel(level)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    targetLevel === level
                      ? "bg-brand-green/10 border-brand-green/40"
                      : "bg-bg-input border-border-default hover:border-border-strong"
                  }`}
                >
                  <div className="text-lg font-bold mb-1">{formatGoalLevel(level)}</div>
                  <div className="text-xs text-text-muted">
                    {level === "B2"
                      ? "Strong CEFR target"
                      : level === "CLB_7"
                        ? "Immigration baseline"
                        : "Higher immigration band"}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="grid grid-cols-2 gap-3">
              {CURRENT_LEVEL_SELF_ASSESSMENTS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setCurrentLevelSelfAssessment(level)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    currentLevelSelfAssessment === level
                      ? "bg-brand-green/10 border-brand-green/40"
                      : "bg-bg-input border-border-default hover:border-border-strong"
                  }`}
                >
                  <div className="text-lg font-bold mb-1">{formatCEFRLevel(level)}</div>
                  <div className="text-xs text-text-muted">
                    Self-assessed today
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setWeakestSkill(skill)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    weakestSkill === skill
                      ? "bg-brand-green/10 border-brand-green/40"
                      : "bg-bg-input border-border-default hover:border-border-strong"
                  }`}
                >
                  <div className="font-medium mb-1">{formatSkillType(skill)}</div>
                  <div className="text-xs text-text-muted">
                    We&apos;ll prioritize drills here first.
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-5">
              <div>
                <label className="text-sm text-text-secondary mb-1.5 block">
                  Exam Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="date"
                    value={examDate}
                    onChange={(event) => setExamDate(event.target.value)}
                    className="input pl-10"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Optional for now. You can add it later.
                </p>
              </div>

              <div>
                <label className="text-sm text-text-secondary mb-3 block">
                  Daily Study Time
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {studyTimeOptions.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setDailyTimeMinutes(minutes)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        dailyTimeMinutes === minutes
                          ? "bg-brand-green/10 border-brand-green/40"
                          : "bg-bg-input border-border-default hover:border-border-strong"
                      }`}
                    >
                      <Clock3 className="w-4 h-4 mx-auto mb-2 text-text-muted" />
                      <div className="font-semibold">{minutes} min</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-2xl gradient-green-purple flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Your plan is ready!</h3>
              <p className="text-sm text-text-secondary mb-2">
                Exam:{" "}
                <span className="text-text-primary font-medium">
                  {targetExam ? formatExamType(targetExam) : ""}
                </span>
              </p>
              <p className="text-sm text-text-secondary mb-2">
                Target:{" "}
                <span className="text-text-primary font-medium">
                  {targetLevel ? formatGoalLevel(targetLevel) : ""}
                </span>
              </p>
              <p className="text-sm text-text-secondary mb-2">
                Focus:{" "}
                <span className="text-brand-green font-medium">
                  {weakestSkill ? formatSkillType(weakestSkill) : ""}
                </span>
              </p>
              <p className="text-sm text-text-secondary">
                Daily goal:{" "}
                <span className="text-text-primary font-medium">
                  {dailyTimeMinutes ? `${dailyTimeMinutes} minutes` : ""}
                </span>
              </p>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-accent-rose mt-6">{errorMessage}</p>
          ) : null}

          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
              className={`btn btn-ghost ${currentStep === 0 ? "invisible" : ""}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((step) => step + 1)}
                disabled={!canProceed}
                className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="btn btn-primary btn-lg"
                disabled={isSubmitting}
              >
                <Target className="w-5 h-5" />
                {isSubmitting ? "Saving..." : "Go to Dashboard"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function isExamType(value: string | null): value is ExamType {
  return value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED";
}

function isGoalLevel(value: string | null): value is GoalLevel {
  return value === "B2" || value === "CLB_7" || value === "CLB_8";
}

function isCurrentLevel(
  value: string | null,
): value is CurrentLevelSelfAssessment {
  return value === "A2" || value === "B1" || value === "B1_PLUS" || value === "B2_MINUS";
}

function isSkillType(value: string | null): value is SkillType {
  return (
    value === "LISTENING" ||
    value === "READING" ||
    value === "WRITING" ||
    value === "SPEAKING" ||
    value === "VOCABULARY"
  );
}
