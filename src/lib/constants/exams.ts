import type {
  CEFRLevel,
  CurrentLevelSelfAssessment,
  ExamType,
  ExamScope,
  GoalLevel,
  SkillType,
  TopicType,
  TrapType,
} from "@/lib/types";

export const APP_NAME = "FrancScore";
export const APP_TAGLINE = "Your AI Exam Coach for TEF & TCF Canada";
export const APP_DESCRIPTION =
  "Master TEF Canada and TCF Canada with AI-powered diagnostics, daily practice drills, writing and speaking correction, and a gamified B2 Readiness Score.";

export const EXAM_TYPES: ExamType[] = [
  "TEF_CANADA",
  "TCF_CANADA",
  "MIXED",
];

export const EXAM_SCOPES: ExamScope[] = [...EXAM_TYPES, "ALL_EXAMS"];

export const EXAM_TYPE_LABELS: Record<ExamScope, string> = {
  TEF_CANADA: "TEF Canada",
  TCF_CANADA: "TCF Canada",
  MIXED: "Mixed Mode",
  ALL_EXAMS: "Both",
};

export const CEFR_LEVELS: CEFRLevel[] = [
  "A1",
  "A2",
  "B1_MINUS",
  "B1",
  "B1_PLUS",
  "B2_MINUS",
  "B2",
  "B2_PLUS",
  "C1",
];

export const CEFR_LEVEL_LABELS: Record<CEFRLevel, string> = {
  A1: "A1",
  A2: "A2",
  B1_MINUS: "B1-",
  B1: "B1",
  B1_PLUS: "B1+",
  B2_MINUS: "B2-",
  B2: "B2",
  B2_PLUS: "B2+",
  C1: "C1",
};

export const GOAL_LEVELS: GoalLevel[] = ["B2", "CLB_7", "CLB_8"];

export const GOAL_LEVEL_LABELS: Record<GoalLevel, string> = {
  B2: "B2",
  CLB_7: "CLB 7",
  CLB_8: "CLB 8",
};

export const CURRENT_LEVEL_SELF_ASSESSMENTS: CurrentLevelSelfAssessment[] = [
  "A2",
  "B1",
  "B1_PLUS",
  "B2_MINUS",
];

export const SKILLS: SkillType[] = [
  "LISTENING",
  "READING",
  "WRITING",
  "SPEAKING",
  "VOCABULARY",
];

export const PRACTICE_SKILLS: Exclude<SkillType, "VOCABULARY">[] = [
  "LISTENING",
  "READING",
  "WRITING",
  "SPEAKING",
];

export const SKILL_LABELS: Record<SkillType, string> = {
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
  VOCABULARY: "Vocabulary",
};

export const SKILL_FRENCH_LABELS: Record<SkillType, string> = {
  LISTENING: "Compréhension orale",
  READING: "Compréhension écrite",
  WRITING: "Expression écrite",
  SPEAKING: "Expression orale",
  VOCABULARY: "Vocabulaire",
};

export const SKILL_ICONS: Record<SkillType, string> = {
  LISTENING: "Headphones",
  READING: "BookOpen",
  WRITING: "PenTool",
  SPEAKING: "Mic",
  VOCABULARY: "Library",
};

export const TOPIC_TYPES: TopicType[] = [
  "WORK",
  "HOUSING",
  "HEALTH",
  "ADMINISTRATION",
  "OPINION",
  "EDUCATION",
  "IMMIGRATION",
  "DAILY_LIFE",
  "ENVIRONMENT",
  "TECHNOLOGY",
  "CULTURE",
  "TRAVEL",
];

export const TOPIC_LABELS: Record<TopicType, string> = {
  WORK: "Work",
  HOUSING: "Housing",
  HEALTH: "Health",
  ADMINISTRATION: "Administration",
  OPINION: "Opinion",
  EDUCATION: "Education",
  IMMIGRATION: "Immigration",
  DAILY_LIFE: "Daily Life",
  ENVIRONMENT: "Environment",
  TECHNOLOGY: "Technology",
  CULTURE: "Culture",
  TRAVEL: "Travel",
};

export const TRAP_TYPE_LABELS: Record<TrapType, string> = {
  NEGATION: "Negation",
  NUMBER_DATE: "Number / Date",
  CONTRAST_MARKER: "Contrast Marker",
  SYNONYM_TRAP: "Synonym Trap",
  FALSE_FRIEND: "False Friend",
  DOUBLE_NEGATIVE: "Double Negative",
  IMPLICIT_MEANING: "Implicit Meaning",
};

export const TRAP_TYPES = [
  { id: "NEGATION", label: "Negation", color: "#ef4444" },
  { id: "NUMBER_DATE", label: "Number / Date", color: "#f59e0b" },
  { id: "CONTRAST_MARKER", label: "Contrast Marker", color: "#8b5cf6" },
  { id: "SYNONYM_TRAP", label: "Synonym Trap", color: "#3b82f6" },
  { id: "FALSE_FRIEND", label: "False Friend", color: "#f97316" },
  { id: "DOUBLE_NEGATIVE", label: "Double Negative", color: "#ef4444" },
  { id: "IMPLICIT_MEANING", label: "Implicit Meaning", color: "#6366f1" },
] as const satisfies ReadonlyArray<{
  id: TrapType;
  label: string;
  color: string;
}>;
