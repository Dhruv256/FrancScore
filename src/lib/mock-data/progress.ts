import type { AnalyticsData, ReadinessScore, SkillProgress } from "@/lib/types";

export const mockSkillProgress: SkillProgress[] = [
  {
    skill: "LISTENING",
    percentage: 58,
    cefrEstimate: "B1",
    trend: "UP",
    totalQuestions: 245,
    correctAnswers: 142,
    lastPracticed: "2026-05-04",
  },
  {
    skill: "READING",
    percentage: 72,
    cefrEstimate: "B1_PLUS",
    trend: "UP",
    totalQuestions: 198,
    correctAnswers: 143,
    lastPracticed: "2026-05-04",
  },
  {
    skill: "WRITING",
    percentage: 45,
    cefrEstimate: "B1_MINUS",
    trend: "STABLE",
    totalQuestions: 34,
    correctAnswers: 15,
    lastPracticed: "2026-05-03",
  },
  {
    skill: "SPEAKING",
    percentage: 38,
    cefrEstimate: "B1_MINUS",
    trend: "DOWN",
    totalQuestions: 28,
    correctAnswers: 11,
    lastPracticed: "2026-05-02",
  },
];

export const mockReadinessScore: ReadinessScore = {
  overall: 53,
  bySkill: {
    LISTENING: 58,
    READING: 72,
    WRITING: 45,
    SPEAKING: 38,
  },
  cefrEstimate: "B1",
  lastUpdated: "2026-05-04",
};

export const mockAnalyticsData: AnalyticsData[] = [
  { date: "2026-04-28", listening: 45, reading: 60, writing: 35, speaking: 30, xp: 180, questionsAnswered: 32 },
  { date: "2026-04-29", listening: 48, reading: 62, writing: 38, speaking: 32, xp: 220, questionsAnswered: 38 },
  { date: "2026-04-30", listening: 50, reading: 65, writing: 40, speaking: 33, xp: 190, questionsAnswered: 28 },
  { date: "2026-05-01", listening: 53, reading: 68, writing: 42, speaking: 35, xp: 310, questionsAnswered: 45 },
  { date: "2026-05-02", listening: 55, reading: 70, writing: 43, speaking: 36, xp: 250, questionsAnswered: 40 },
  { date: "2026-05-03", listening: 56, reading: 71, writing: 44, speaking: 37, xp: 200, questionsAnswered: 35 },
  { date: "2026-05-04", listening: 58, reading: 72, writing: 45, speaking: 38, xp: 280, questionsAnswered: 42 },
];
