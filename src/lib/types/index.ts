export type ISODateString = string;

export type ExamType = "TEF_CANADA" | "TCF_CANADA" | "MIXED";
export type ExamScope = ExamType | "ALL_EXAMS";
export type ProfileRole = "USER" | "ADMIN";
export type GoalLevel = "B2" | "CLB_7" | "CLB_8";
export type CurrentLevelSelfAssessment = "A2" | "B1" | "B1_PLUS" | "B2_MINUS";

export type SkillType =
  | "LISTENING"
  | "READING"
  | "WRITING"
  | "SPEAKING"
  | "VOCABULARY";

export type CEFRLevel =
  | "A1"
  | "A2"
  | "B1_MINUS"
  | "B1"
  | "B1_PLUS"
  | "B2_MINUS"
  | "B2"
  | "B2_PLUS"
  | "C1";

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";
export type TrendDirection = "UP" | "DOWN" | "STABLE";
export type TaskStatus = "DONE" | "PENDING" | "LOCKED";
export type BadgeCategory =
  | "LISTENING"
  | "READING"
  | "WRITING"
  | "SPEAKING"
  | "VOCABULARY"
  | "MOCK_TEST"
  | "STREAK"
  | "MASTERY";

export type TrapType =
  | "NEGATION"
  | "NUMBER_DATE"
  | "CONTRAST_MARKER"
  | "SYNONYM_TRAP"
  | "FALSE_FRIEND"
  | "DOUBLE_NEGATIVE"
  | "IMPLICIT_MEANING";

export type TopicType =
  | "WORK"
  | "HOUSING"
  | "HEALTH"
  | "ADMINISTRATION"
  | "OPINION"
  | "EDUCATION"
  | "IMMIGRATION"
  | "DAILY_LIFE"
  | "ENVIRONMENT"
  | "TECHNOLOGY"
  | "CULTURE"
  | "TRAVEL";

export type WritingPromptType =
  | "FORMAL_LETTER"
  | "ESSAY"
  | "EMAIL"
  | "REPORT"
  | "OPINION";

export type WritingSubmissionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "REVIEWED"
  | "AI_FAILED";

export type SpeakingSubmissionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "REVIEWED"
  | "AI_FAILED";

export type SpeakingPromptType =
  | "MONOLOGUE"
  | "DIALOGUE"
  | "DESCRIPTION"
  | "OPINION"
  | "DEBATE";

export type VocabularyStatus = "NEW" | "LEARNING" | "WEAK" | "MASTERED";
export type FlashcardReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";
export type FlashcardDeckType =
  | "ALL"
  | "WEAK_WORDS"
  | "HIGH_FREQUENCY"
  | "TOPIC"
  | "TRAP_WORDS"
  | "CONNECTORS"
  | "LISTENING_TRAPS"
  | "CUSTOM";

export interface UserProfile {
  id: string;
  fullName: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: ProfileRole;
  examType: ExamType;
  targetExam: ExamType;
  targetLevel: GoalLevel;
  examDate?: ISODateString;
  currentLevelSelfAssessment?: CurrentLevelSelfAssessment;
  weakestSkill?: SkillType;
  dailyTimeMinutes?: number;
  onboardingCompleted: boolean;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  joinedAt: ISODateString;
}

export type User = UserProfile;
export type ListeningQuestion = Question;
export type ReadingQuestion = Question;
export type ReadingPassage = Passage;
export type VocabStatus = VocabularyStatus;
export type FlashcardMode = FlashcardDeckType;

export interface SkillProgress {
  skill: SkillType;
  percentage: number;
  cefrEstimate: CEFRLevel;
  trend: TrendDirection;
  totalQuestions: number;
  correctAnswers: number;
  lastPracticed: ISODateString;
}

export interface ReadinessScore {
  overall: number;
  bySkill: Record<Exclude<SkillType, "VOCABULARY">, number>;
  cefrEstimate: CEFRLevel;
  lastUpdated: ISODateString;
}

export interface Question {
  id: string;
  skillType: Exclude<SkillType, "VOCABULARY">;
  examType: ExamScope;
  cefrLevel: CEFRLevel;
  topicType: TopicType;
  difficulty: DifficultyLevel;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  tags: string[];
  trapType?: TrapType;
  audioUrl?: string;
  passageId?: string;
  transcript?: string;
}

export interface Passage {
  id: string;
  title: string;
  content: string;
  questions: Question[];
  cefrLevel: CEFRLevel;
  examType: ExamScope;
  topicType: TopicType;
  wordCount: number;
  estimatedMinutes: number;
  highlightedVocabulary: string[];
}

export interface VocabularyWord {
  id: string;
  frenchWord: string;
  englishMeaning: string;
  frenchExample?: string;
  englishExampleTranslation?: string;
  cefrLevel: CEFRLevel;
  topicType: TopicType;
  examType: ExamScope;
  frequencyScore: number;
  tags: string[];
  trapType?: TrapType;
  isPublished: boolean;
  status?: VocabularyStatus;
  reviewCount?: number;
  lastReviewedAt?: ISODateString;
  nextReviewAt?: ISODateString;
}

export interface UserWordBankItem {
  id: string;
  userId: string;
  wordId: string;
  status: VocabularyStatus;
  easeScore: number;
  reviewCount: number;
  mistakeCount: number;
  correctCount: number;
  lastReviewedAt?: ISODateString;
  nextReviewAt?: ISODateString;
  isInWeakWords: boolean;
  isMastered: boolean;
}

export interface WritingPrompt {
  id: string;
  title: string;
  prompt: string;
  type: WritingPromptType;
  cefrLevel: CEFRLevel;
  examType: ExamScope;
  topicType: TopicType;
  wordLimit: {
    min: number;
    max: number;
  };
  criteria: string[];
  sampleResponse?: string;
}

export interface WritingSubmission {
  id: string;
  userId: string;
  promptId: string;
  examType: ExamType;
  text: string;
  wordCount: number;
  submittedAt: ISODateString;
  status?: WritingSubmissionStatus;
  score20?: number;
  estimatedCefr?: CEFRLevel;
  aiReview?: WritingFeedback;
}

export interface SpeakingPrompt {
  id: string;
  title: string;
  prompt: string;
  type: SpeakingPromptType;
  cefrLevel: CEFRLevel;
  examType: ExamScope;
  topicType: TopicType;
  durationSeconds: number;
  preparationSeconds: number;
  criteria: string[];
}

export interface SpeakingSubmission {
  id: string;
  userId: string;
  promptId: string;
  examType: ExamType;
  audioUrl: string;
  transcript?: string;
  submittedAt: ISODateString;
  status?: SpeakingSubmissionStatus;
  score20?: number;
  estimatedCefr?: CEFRLevel;
  aiReview?: SpeakingFeedback;
}

export interface MockTestSection {
  skill: Exclude<SkillType, "VOCABULARY">;
  questionCount: number;
  duration: number;
  score?: number;
  cefrEstimate?: CEFRLevel;
}

export interface MockTest {
  id: string;
  title: string;
  examType: ExamType;
  sections: MockTestSection[];
  totalDuration: number;
  isCompleted: boolean;
  completedAt?: ISODateString;
}

export interface MockTestResultSkill {
  skill: Exclude<SkillType, "VOCABULARY">;
  score: number;
  cefrEstimate: CEFRLevel;
  weakAreas: string[];
}

export interface RepairPlanTask {
  title: string;
  skill: Exclude<SkillType, "VOCABULARY">;
  description: string;
  estimatedMinutes: number;
}

export interface RepairPlanDay {
  day: number;
  tasks: RepairPlanTask[];
}

export interface MockTestResult {
  testId: string;
  overallScore: number;
  cefrEstimate: CEFRLevel;
  skills: MockTestResultSkill[];
  repairPlan: RepairPlanDay[];
  completedAt: ISODateString;
  weakestSkill?: Exclude<SkillType, "VOCABULARY">;
  weakTrapTypes?: TrapType[];
  readinessImpact?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  earnedAt?: ISODateString;
  progress: number;
  requirement: string;
  xpReward: number;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  skill: SkillType;
  xpReward: number;
  status: TaskStatus;
  estimatedMinutes: number;
  icon: string;
  taskType?: string;
  targetCount?: number;
  progressCount?: number;
}

export interface WeaknessQuest {
  id: string;
  title: string;
  description: string;
  skill: Exclude<SkillType, "VOCABULARY">;
  trapType: TrapType;
  questionsCount: number;
  xpReward: number;
  difficulty: DifficultyLevel;
}

export interface AIReviewResult {
  id: string;
  submissionType: "WRITING" | "SPEAKING";
  modelId: string;
  overallScore: number;
  estimatedCefrLevel: CEFRLevel;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  createdAt: ISODateString;
}

export interface WritingFeedback extends AIReviewResult {
  submissionType: "WRITING";
  score: number;
  score20?: number;
  estimatedLevel: CEFRLevel;
  taskCompletion?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  structureScore?: number;
  grammarIssues: Array<{
    text: string;
    correction: string;
    explanation: string;
  }>;
  vocabularyUpgrades: Array<{
    original: string;
    suggestion: string;
    reason: string;
  }>;
  structureFeedback: string;
  b2Rewrite: string;
  rewrittenResponse: string;
  nextDrill: string;
}

export interface SpeakingFeedback extends AIReviewResult {
  submissionType: "SPEAKING";
  fluency: number;
  grammar: number;
  vocabulary: number;
  structure: number;
  taskRelevance: number;
  score20?: number;
  estimatedScore: number;
  transcript: string;
  betterPhrases?: string[];
  feedbackSummary?: string;
  corrections: Array<{
    original: string;
    corrected: string;
  }>;
}

export interface FlashcardSessionReview {
  id?: string;
  wordId: string;
  rating: FlashcardReviewRating;
  reviewedAt: ISODateString;
  xpEarned: number;
  previousStatus?: VocabularyStatus;
  nextStatus?: VocabularyStatus;
}

export interface FlashcardSession {
  id?: string;
  deckType: FlashcardDeckType;
  totalCards: number;
  reviewed: number;
  mastered: number;
  weakAdded: number;
  xpEarned: number;
  masteryImprovement: number;
  reviews: FlashcardSessionReview[];
  startedAt: ISODateString;
  completedAt?: ISODateString;
}

export interface AnalyticsData {
  date: ISODateString;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  xp: number;
  questionsAnswered: number;
}
