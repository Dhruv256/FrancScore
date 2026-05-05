import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  CEFR_LEVEL_LABELS,
  EXAM_TYPE_LABELS,
  SKILL_LABELS,
  TOPIC_LABELS,
  TRAP_TYPE_LABELS,
  VOCABULARY_STATUS_LABELS,
} from "@/lib/constants";
import type {
  CEFRLevel,
  GoalLevel,
  ExamScope,
  SkillType,
  TopicType,
  TrapType,
  VocabularyStatus,
} from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function daysUntil(targetDate: Date): number {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getXPForLevel(level: number): number {
  return level * 500;
}

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 30) return "🔥";
  if (streak >= 14) return "⚡";
  if (streak >= 7) return "✨";
  if (streak >= 3) return "💪";
  return "🌱";
}

export function formatCEFRLevel(level: CEFRLevel): string {
  return CEFR_LEVEL_LABELS[level];
}

export function formatExamType(examType: ExamScope): string {
  return EXAM_TYPE_LABELS[examType];
}

export function formatGoalLevel(level: GoalLevel): string {
  if (level === "CLB_7") return "CLB 7";
  if (level === "CLB_8") return "CLB 8";
  return level;
}

export function formatSkillType(skill: SkillType): string {
  return SKILL_LABELS[skill];
}

export function formatTopicType(topic: TopicType): string {
  return TOPIC_LABELS[topic];
}

export function formatTrapType(trapType: TrapType): string {
  return TRAP_TYPE_LABELS[trapType];
}

export function formatVocabularyStatus(status: VocabularyStatus): string {
  return VOCABULARY_STATUS_LABELS[status];
}

export function getCEFRColor(level: CEFRLevel): string {
  const colors: Record<CEFRLevel, string> = {
    A1: "var(--color-text-secondary)",
    A2: "var(--color-cefr-a2)",
    B1_MINUS: "var(--color-cefr-b1-minus)",
    B1: "var(--color-cefr-b1)",
    B1_PLUS: "var(--color-cefr-b1-plus)",
    B2_MINUS: "var(--color-cefr-b2-minus)",
    B2: "var(--color-cefr-b2)",
    B2_PLUS: "var(--color-cefr-b2-plus)",
    C1: "var(--color-cefr-c1)",
  };
  return colors[level];
}

export function getSkillColor(skill: SkillType): string {
  const colors: Record<SkillType, string> = {
    LISTENING: "var(--color-skill-listening)",
    READING: "var(--color-skill-reading)",
    WRITING: "var(--color-skill-writing)",
    SPEAKING: "var(--color-skill-speaking)",
    VOCABULARY: "var(--color-brand-purple)",
  };
  return colors[skill];
}
