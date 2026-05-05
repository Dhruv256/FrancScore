import "server-only";

import { buildFallbackSpeakingEvaluation, buildFallbackStudyPlan, buildFallbackWritingEvaluation, buildSpeakingEvaluationMessages, buildStudyPlanMessages, buildWritingEvaluationMessages } from "@/lib/ai/prompts";
import { generateStructuredObject, isNvidiaEnabled } from "@/lib/ai/nvidia-client";
import { speakingEvaluationSchema, studyPlanResponseSchema, writingEvaluationSchema } from "@/lib/ai/schemas";
import { getAuthContext, getProfileDisplayName } from "@/lib/auth";
import { XP_REWARDS, applyXpAndStreak } from "@/lib/gamification/xp";
import { getUserReadinessSnapshot, getCefrEstimate } from "@/lib/gamification/readiness";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { CEFRLevel, ExamType, RepairPlanDay, TopicType, TrapType, WritingPrompt, SpeakingPrompt } from "@/lib/types";
import type {
  MockSelectableTest,
  MockSessionPayload,
  MockMcqItem,
  MockCompletionResult,
  MockMistakeReviewItem,
  MockCompleteRequest,
  MockSkillComputation,
} from "@/lib/mocks/types";

type MockTestRow = Database["public"]["Tables"]["mock_tests"]["Row"];
type MockSectionRow = Database["public"]["Tables"]["mock_test_sections"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type PassageRow = Database["public"]["Tables"]["passages"]["Row"];
type MockResultInsert = Database["public"]["Tables"]["mock_test_results"]["Insert"];

export async function getAvailableMockTests(userId: string): Promise<MockSelectableTest[]> {
  const supabase = await createClient();
  const [{ data: tests, error: testsError }, { data: sections, error: sectionsError }, { data: results, error: resultsError }] = await Promise.all([
    supabase.from("mock_tests").select("*").eq("is_published", true).order("created_at", { ascending: true }),
    supabase.from("mock_test_sections").select("*").order("sort_order", { ascending: true }),
    supabase.from("mock_test_results").select("mock_test_id").eq("user_id", userId),
  ]);

  if (testsError) throw new Error(testsError.message);
  if (sectionsError) throw new Error(sectionsError.message);
  if (resultsError) throw new Error(resultsError.message);

  const completedIds = new Set((results ?? []).map((row) => row.mock_test_id));
  const sectionsByTest = groupSectionsByTest(sections ?? []);

  return ((tests ?? []) as MockTestRow[]).map((test) => ({
    id: test.id,
    title: test.title,
    description: test.description,
    examType: normalizeExamType(test.exam_type),
    totalDuration: (sectionsByTest.get(test.id) ?? []).reduce(
      (sum, section) => sum + section.duration_minutes,
      0,
    ),
    isCompleted: completedIds.has(test.id),
    sections: (sectionsByTest.get(test.id) ?? [])
      .map((section) => ({
        id: section.id,
        skill: normalizeSectionSkill(section.skill_type),
        questionCount: section.question_count,
        durationMinutes: section.duration_minutes,
      })),
  }));
}

export async function loadMockSession(mockTestId: string, userId: string): Promise<MockSessionPayload> {
  const supabase = await createClient();
  const [{ data: test, error: testError }, { data: sections, error: sectionsError }] = await Promise.all([
    supabase.from("mock_tests").select("*").eq("id", mockTestId).eq("is_published", true).single(),
    supabase.from("mock_test_sections").select("*").eq("mock_test_id", mockTestId).order("sort_order", { ascending: true }),
  ]);

  if (testError || !test) {
    throw new Error("Mock test not found.");
  }
  if (sectionsError) throw new Error(sectionsError.message);

  const normalizedTest = {
    id: test.id,
    title: test.title,
    description: test.description,
    examType: normalizeExamType(test.exam_type),
    totalDuration: (sections ?? []).reduce(
      (sum, section) => sum + section.duration_minutes,
      0,
    ),
    isCompleted: false,
    sections: (sections ?? []).map((section) => ({
      id: section.id,
      skill: normalizeSectionSkill(section.skill_type),
      questionCount: section.question_count,
      durationMinutes: section.duration_minutes,
    })),
  } satisfies MockSelectableTest;

  const readingCount = normalizedTest.sections.find((section) => section.skill === "READING")?.questionCount ?? 0;
  const listeningCount = normalizedTest.sections.find((section) => section.skill === "LISTENING")?.questionCount ?? 0;
  const includeWriting = normalizedTest.sections.some((section) => section.skill === "WRITING");
  const includeSpeaking = normalizedTest.sections.some((section) => section.skill === "SPEAKING");

  const [reading, listening, writingPrompt, speakingPrompt] = await Promise.all([
    readingCount ? fetchQuestionsForMock("READING", normalizedTest.examType, readingCount) : Promise.resolve([]),
    listeningCount ? fetchQuestionsForMock("LISTENING", normalizedTest.examType, listeningCount) : Promise.resolve([]),
    includeWriting ? fetchWritingPromptForMock(normalizedTest.examType) : Promise.resolve(null),
    includeSpeaking ? fetchSpeakingPromptForMock(normalizedTest.examType) : Promise.resolve(null),
  ]);

  void userId;

  return {
    test: normalizedTest,
    listening,
    reading,
    writingPrompt,
    speakingPrompt,
  };
}

export async function completeMockTest(
  userId: string,
  input: MockCompleteRequest,
): Promise<MockCompletionResult> {
  const supabase = await createClient();
  const session = await loadMockSession(input.mockTestId, userId);
  const allMcqs = [...session.listening, ...session.reading];
  const questionIds = allMcqs.map((item) => item.id);

  const { data: questionRows, error: questionError } = await supabase
    .from("questions")
    .select("*")
    .in("id", questionIds);
  if (questionError) throw new Error(questionError.message);
  const questionMap = new Map((questionRows ?? []).map((row) => [row.id, row]));

  const readingScore = computeMcqSectionScore(session.reading, input.answers, questionMap, "READING");
  const listeningScore = computeMcqSectionScore(session.listening, input.answers, questionMap, "LISTENING");
  const writingScore = session.writingPrompt
    ? await evaluateWritingSection(session.writingPrompt, input.writingResponse)
    : { score: 0, cefr: "A1" as CEFRLevel, weakAreas: ["No writing section configured"] };
  const speakingScore = session.speakingPrompt
    ? await evaluateSpeakingSection(session.speakingPrompt, input.speakingTranscript)
    : { score: 0, cefr: "A1" as CEFRLevel, weakAreas: ["No speaking section configured"] };

  const skills: MockSkillComputation[] = [
    {
      skill: "LISTENING" as const,
      score: listeningScore.score,
      cefrEstimate: listeningScore.cefr,
      weakAreas: listeningScore.weakAreas,
    },
    {
      skill: "READING" as const,
      score: readingScore.score,
      cefrEstimate: readingScore.cefr,
      weakAreas: readingScore.weakAreas,
    },
    {
      skill: "WRITING" as const,
      score: writingScore.score,
      cefrEstimate: writingScore.cefr,
      weakAreas: writingScore.weakAreas,
    },
    {
      skill: "SPEAKING" as const,
      score: speakingScore.score,
      cefrEstimate: speakingScore.cefr,
      weakAreas: speakingScore.weakAreas,
    },
  ].filter((item) => !Number.isNaN(item.score));

  const overallScore = Math.round(
    skills.reduce((sum, skill) => sum + skill.score, 0) / Math.max(skills.length, 1),
  );
  const cefrEstimate = getCefrEstimate(overallScore);
  const weakestSkill =
    skills.slice().sort((left, right) => left.score - right.score)[0]?.skill ?? "READING";
  const weakTrapTypes = dedupeTrapTypes([
    ...listeningScore.weakTrapTypes,
    ...readingScore.weakTrapTypes,
  ]);
  const reviewMistakes = [...listeningScore.reviewMistakes, ...readingScore.reviewMistakes];
  const readinessBefore = await getUserReadinessSnapshot(userId);
  const readinessImpact = Math.max(
    -8,
    Math.min(8, Math.round((overallScore - readinessBefore.readinessScore.overall) / 8)),
  );
  const repairPlan = await buildRepairPlan({
    overallScore,
    targetExam: session.test.examType,
    weaknesses: [
      ...skills
        .sort((left, right) => left.score - right.score)
        .slice(0, 3)
        .map((skill) => `${skill.skill}: ${skill.score}%`),
      ...weakTrapTypes.map((trap) => `Trap focus: ${trap}`),
    ],
  });

  const persisted: MockResultInsert = {
    user_id: userId,
    mock_test_id: input.mockTestId,
    overall_score: overallScore,
    cefr_estimate: cefrEstimate,
    skill_breakdown: {
      skills,
      weakTrapTypes,
      weakestSkill,
      reviewMistakes,
      readinessImpact,
    } as unknown as MockResultInsert["skill_breakdown"],
    repair_plan: repairPlan as unknown as MockResultInsert["repair_plan"],
  };

  const { error: saveError } = await supabase.from("mock_test_results").insert(persisted);
  if (saveError) throw new Error(saveError.message);

  await applyXpAndStreak(userId, XP_REWARDS.MOCK_TEST_COMPLETED, new Date().toISOString());

  return {
    testId: input.mockTestId,
    overallScore,
    cefrEstimate,
    completedAt: new Date().toISOString(),
    skills: skills.map((skill) => ({
      skill: skill.skill,
      score: skill.score,
      cefrEstimate: skill.cefrEstimate,
      weakAreas: skill.weakAreas,
    })),
    weakestSkill,
    weakTrapTypes,
    readinessImpact,
    writingScore: writingScore.score,
    speakingScore: speakingScore.score,
    reviewMistakes,
    repairPlan,
  };
}

async function fetchQuestionsForMock(
  skill: "LISTENING" | "READING",
  examType: ExamType,
  count: number,
): Promise<MockMcqItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select("*, passages(*)")
    .eq("skill_type", skill)
    .eq("is_published", true)
    .limit(Math.max(count * 3, count));

  if (examType === "MIXED") {
    query = query.in("exam_type", ["MIXED", "BOTH", "TEF_CANADA", "TCF_CANADA"]);
  } else {
    query = query.in("exam_type", [examType, "BOTH", "MIXED"]);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const picked = (data ?? []).slice(0, count);
  return picked.map((row) => mapQuestionRowToMockItem(row as QuestionRow & { passages?: PassageRow | null }));
}

async function fetchWritingPromptForMock(examType: ExamType): Promise<WritingPrompt | null> {
  const supabase = await createClient();
  let query = supabase.from("writing_prompts").select("*").eq("is_published", true).limit(1);
  query =
    examType === "MIXED"
      ? query.in("exam_type", ["MIXED", "BOTH", "TEF_CANADA", "TCF_CANADA"])
      : query.in("exam_type", [examType, "MIXED", "BOTH"]);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    type: normalizeWritingType(row.type),
    cefrLevel: normalizeCefr(row.cefr_level),
    examType: normalizeExamPromptScope(row.exam_type),
    topicType: normalizeTopic(row.topic),
    wordLimit: {
      min: row.word_limit_min ?? 120,
      max: row.word_limit_max ?? 250,
    },
    criteria: Array.isArray(row.criteria)
      ? row.criteria.filter((item): item is string => typeof item === "string")
      : [],
    sampleResponse: row.sample_response ?? undefined,
  };
}

async function fetchSpeakingPromptForMock(examType: ExamType): Promise<SpeakingPrompt | null> {
  const supabase = await createClient();
  let query = supabase.from("speaking_prompts").select("*").eq("is_published", true).limit(1);
  query =
    examType === "MIXED"
      ? query.in("exam_type", ["MIXED", "BOTH", "TEF_CANADA", "TCF_CANADA"])
      : query.in("exam_type", [examType, "MIXED", "BOTH"]);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    type: normalizeSpeakingType(row.type),
    cefrLevel: normalizeCefr(row.cefr_level),
    examType: normalizeExamPromptScope(row.exam_type),
    topicType: normalizeTopic(row.topic),
    durationSeconds: row.duration_seconds ?? 90,
    preparationSeconds: row.preparation_seconds ?? 30,
    criteria: Array.isArray(row.criteria)
      ? row.criteria.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function mapQuestionRowToMockItem(row: QuestionRow & { passages?: PassageRow | null }): MockMcqItem {
  const options = Array.isArray(row.options)
    ? row.options.map((item) => String(item))
    : [];
  return {
    id: row.id,
    skill: row.skill_type === "LISTENING" ? "LISTENING" : "READING",
    questionText: row.question_text,
    options,
    topic: normalizeTopicNullable(row.topic),
    trapType: normalizeTrapNullable(row.trap_type),
    difficulty: row.difficulty,
    explanation: row.explanation,
    passage: row.passages
      ? {
          id: row.passages.id,
          title: row.passages.title,
          content: row.passages.content,
        }
      : null,
    audioUrl: row.audio_url,
    transcript: row.transcript,
  };
}

function computeMcqSectionScore(
  items: MockMcqItem[],
  answers: Record<string, number | null>,
  questionMap: Map<string, QuestionRow>,
  skill: "LISTENING" | "READING",
) {
  const relevant = items.map((item) => {
    const question = questionMap.get(item.id);
    const selected = answers[item.id] ?? null;
    const correct = question?.correct_answer_index ?? 0;
    return {
      item,
      selected,
      correct,
      isCorrect: selected !== null && selected === correct,
      trap: normalizeTrapNullable(question?.trap_type ?? null),
    };
  });

  const total = relevant.length;
  const correctCount = relevant.filter((item) => item.isCorrect).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;
  const weakTrapTypes = relevant
    .filter((item) => !item.isCorrect && item.trap)
    .map((item) => item.trap as TrapType);
  const trapCounts = new Map<string, number>();
  for (const trap of weakTrapTypes) {
    trapCounts.set(trap, (trapCounts.get(trap) ?? 0) + 1);
  }
  const weakAreas = [
    ...[...trapCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([trap]) => trap.replaceAll("_", " ")),
  ];

  const reviewMistakes: MockMistakeReviewItem[] = relevant
    .filter((item) => !item.isCorrect)
    .map((item) => ({
      questionId: item.item.id,
      skill,
      questionText: item.item.questionText,
      selectedAnswerIndex: item.selected,
      correctAnswerIndex: item.correct,
      options: item.item.options,
      explanation: item.item.explanation,
      trapType: item.item.trapType,
      topic: item.item.topic,
    }));

  return {
    score,
    cefr: getCefrEstimate(score),
    weakAreas: weakAreas.length ? weakAreas : ["Accuracy review"],
    weakTrapTypes,
    reviewMistakes,
  };
}

async function evaluateWritingSection(prompt: WritingPrompt, submission: string) {
  const text = submission.trim();
  if (!text) {
    return { score: 0, cefr: "A1" as CEFRLevel, weakAreas: ["No writing response submitted"] };
  }

  const review = isNvidiaEnabled()
    ? await generateStructuredObject({
        schema: writingEvaluationSchema,
        messages: buildWritingEvaluationMessages({
          promptTitle: prompt.title,
          promptText: prompt.prompt,
          criteria: prompt.criteria,
          submissionText: text,
        }),
      }).catch(() => buildFallbackWritingEvaluation({ submissionText: text }))
    : buildFallbackWritingEvaluation({ submissionText: text });

  return {
    score: review.score_20 * 5,
    cefr: review.estimated_cefr,
    weakAreas: review.weaknesses.slice(0, 3),
  };
}

async function evaluateSpeakingSection(prompt: SpeakingPrompt, transcript: string) {
  const text = transcript.trim();
  if (!text) {
    return { score: 0, cefr: "A1" as CEFRLevel, weakAreas: ["No speaking transcript submitted"] };
  }

  const review = isNvidiaEnabled()
    ? await generateStructuredObject({
        schema: speakingEvaluationSchema,
        messages: buildSpeakingEvaluationMessages({
          promptTitle: prompt.title,
          promptText: prompt.prompt,
          criteria: prompt.criteria,
          transcript: text,
        }),
      }).catch(() => buildFallbackSpeakingEvaluation({ transcript: text }))
    : buildFallbackSpeakingEvaluation({ transcript: text });

  return {
    score: review.score_20 * 5,
    cefr: review.estimated_cefr,
    weakAreas: [
      review.feedback,
      ...(review.repeated_words.length
        ? [`Repeated words: ${review.repeated_words.join(", ")}`]
        : []),
    ].slice(0, 3),
  };
}

async function buildRepairPlan(input: {
  overallScore: number;
  targetExam: ExamType;
  weaknesses: string[];
}): Promise<RepairPlanDay[]> {
  const { user, profile } = await getAuthContext();
  const recommendedTasks = [
    "Complete one timed Listening Lab drill and review every trap-based mistake.",
    "Complete one Reading Lab passage and review the explanation panel.",
    "Review 20 weak-word flashcards and re-rate missed cards.",
    "Rewrite one writing response with stronger connectors and clearer structure.",
    "Rehearse one speaking response with a 3-part outline and fewer fillers.",
  ];

  const fallback = buildFallbackStudyPlan({
    days: 7,
    minutesPerDay: profile?.daily_time_minutes ?? 45,
    weaknesses: input.weaknesses,
    recommendedTasks,
  });

  if (!isNvidiaEnabled()) {
    return fallback.daily_plan.map((day) => ({
      day: day.day,
      tasks: day.tasks.map((task, index) => ({
        title: task,
        skill: inferRepairSkill(task, index),
        description: task,
        estimatedMinutes: Math.max(10, Math.round(day.minutes / Math.max(day.tasks.length, 1))),
      })),
    }));
  }

  try {
    const aiPlan = await generateStructuredObject({
      schema: studyPlanResponseSchema,
      messages: buildStudyPlanMessages({
        learnerName: getProfileDisplayName(profile, user),
        targetExam: input.targetExam,
        targetLevel: profile?.target_level ?? null,
        dailyTimeMinutes: profile?.daily_time_minutes ?? 45,
        readinessScore: input.overallScore,
        weaknesses: input.weaknesses,
        recommendedTasks,
        days: 7,
      }),
      maxTokens: 1500,
    });

    return aiPlan.daily_plan.map((day) => ({
      day: day.day,
      tasks: day.tasks.map((task, index) => ({
        title: task,
        skill: inferRepairSkill(task, index),
        description: task,
        estimatedMinutes: Math.max(10, Math.round(day.minutes / Math.max(day.tasks.length, 1))),
      })),
    }));
  } catch {
    return fallback.daily_plan.map((day) => ({
      day: day.day,
      tasks: day.tasks.map((task, index) => ({
        title: task,
        skill: inferRepairSkill(task, index),
        description: task,
        estimatedMinutes: Math.max(10, Math.round(day.minutes / Math.max(day.tasks.length, 1))),
      })),
    }));
  }
}

function inferRepairSkill(task: string, index: number) {
  const normalized = task.toLowerCase();
  if (normalized.includes("listen")) return "LISTENING" as const;
  if (normalized.includes("read")) return "READING" as const;
  if (normalized.includes("write")) return "WRITING" as const;
  if (normalized.includes("speak") || normalized.includes("rehearse")) return "SPEAKING" as const;
  return index % 2 === 0 ? ("READING" as const) : ("LISTENING" as const);
}

function dedupeTrapTypes(values: TrapType[]) {
  return [...new Set(values)];
}

function normalizeExamType(value: string): ExamType {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") return value;
  return "MIXED";
}

function normalizeSectionSkill(value: string) {
  if (value === "LISTENING" || value === "READING" || value === "WRITING" || value === "SPEAKING") {
    return value;
  }
  return "READING";
}

function normalizeExamPromptScope(value: string) {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") return value;
  return "MIXED";
}

function normalizeWritingType(value: string | null) {
  if (value === "FORMAL_LETTER" || value === "ESSAY" || value === "EMAIL" || value === "REPORT" || value === "OPINION") {
    return value;
  }
  return "ESSAY";
}

function normalizeSpeakingType(value: string | null) {
  if (value === "MONOLOGUE" || value === "DIALOGUE" || value === "DESCRIPTION" || value === "OPINION" || value === "DEBATE") {
    return value;
  }
  return "MONOLOGUE";
}

function normalizeCefr(value: string): CEFRLevel {
  if (value === "A1" || value === "A2" || value === "B1_MINUS" || value === "B1" || value === "B1_PLUS" || value === "B2_MINUS" || value === "B2" || value === "B2_PLUS" || value === "C1") {
    return value;
  }
  return "B1";
}

function normalizeTopic(value: string | null): TopicType {
  return normalizeTopicNullable(value) ?? "WORK";
}

function normalizeTopicNullable(value: string | null): TopicType | null {
  if (
    value === "WORK" ||
    value === "HOUSING" ||
    value === "HEALTH" ||
    value === "ADMINISTRATION" ||
    value === "OPINION" ||
    value === "EDUCATION" ||
    value === "IMMIGRATION" ||
    value === "DAILY_LIFE" ||
    value === "ENVIRONMENT" ||
    value === "TECHNOLOGY" ||
    value === "CULTURE" ||
    value === "TRAVEL"
  ) {
    return value;
  }
  return null;
}

function normalizeTrapNullable(value: string | null): TrapType | null {
  if (
    value === "NEGATION" ||
    value === "NUMBER_DATE" ||
    value === "CONTRAST_MARKER" ||
    value === "SYNONYM_TRAP" ||
    value === "FALSE_FRIEND" ||
    value === "DOUBLE_NEGATIVE" ||
    value === "IMPLICIT_MEANING"
  ) {
    return value;
  }
  return null;
}

function groupSectionsByTest(sections: MockSectionRow[]) {
  const map = new Map<string, MockSectionRow[]>();
  for (const section of sections) {
    const bucket = map.get(section.mock_test_id) ?? [];
    bucket.push(section);
    map.set(section.mock_test_id, bucket);
  }
  for (const bucket of map.values()) {
    bucket.sort((left, right) => left.sort_order - right.sort_order);
  }
  return map;
}
