import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import {
  buildFallbackGeneratedQuestion,
  buildQuestionGenerationMessages,
} from "@/lib/ai/prompts";
import {
  generateQuestionRequestSchema,
  generateQuestionResponseSchema,
} from "@/lib/ai/schemas";
import {
  generateStructuredObject,
  isNvidiaEnabled,
  NvidiaAIError,
  runSafetyCheck,
} from "@/lib/ai/nvidia-client";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateQuestionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid question generation payload." },
      { status: 400 },
    );
  }

  try {
    const safety = await runSafetyCheck({
      userInput: parsed.data.prompt_seed ?? `${parsed.data.skill} ${parsed.data.topic}`,
      purpose: "Generate French exam practice content for an admin editor.",
    });

    if (!safety.allowed) {
      return NextResponse.json(
        { error: "This prompt seed could not be used for content generation." },
        { status: 400 },
      );
    }

    const draft = isNvidiaEnabled()
      ? await generateStructuredObject({
          schema: generateQuestionResponseSchema,
          messages: buildQuestionGenerationMessages(parsed.data),
          maxTokens: 1600,
        })
      : buildFallbackGeneratedQuestion(parsed.data);

    let persisted = null;
    if (parsed.data.persist_draft) {
      persisted = await persistDraft(user.id, draft);
    }

    return NextResponse.json({
      draft,
      persisted,
      source: isNvidiaEnabled() ? "ai" : "fallback",
    });
  } catch (error) {
    if (error instanceof NvidiaAIError) {
      return NextResponse.json(
        {
          error:
            error.code === "CONFIG"
              ? "AI question generation is not configured yet."
              : "The AI question generator is unavailable right now.",
          details: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate question." },
      { status: 500 },
    );
  }
}

async function persistDraft(
  adminUserId: string,
  draft: {
    passage: {
      title: string;
      content: string;
      estimated_minutes: number;
      topic: string;
      cefr_level: string;
      exam_type: string;
    } | null;
    question: {
      question_text: string;
      options: string[];
      correct_answer_index: number;
      explanation: string;
      skill_type: "LISTENING" | "READING";
      exam_type: string;
      cefr_level: string;
      topic: string;
      trap_type: string | null;
      difficulty: "EASY" | "MEDIUM" | "HARD";
      transcript: string | null;
      audio_url: string | null;
    };
  },
) {
  const supabase = await createClient();
  let passageId: string | null = null;

  if (draft.passage) {
    const { data: passage, error: passageError } = await supabase
      .from("passages")
      .insert({
        title: draft.passage.title,
        content: draft.passage.content,
        estimated_minutes: draft.passage.estimated_minutes,
        topic: draft.passage.topic,
        cefr_level: draft.passage.cefr_level,
        exam_type: draft.passage.exam_type,
        is_published: false,
        created_by: adminUserId,
      })
      .select("id")
      .single();

    if (passageError) {
      throw new Error(passageError.message);
    }
    passageId = passage.id;
  }

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .insert({
      question_text: draft.question.question_text,
      options: draft.question.options,
      correct_answer_index: draft.question.correct_answer_index,
      explanation: draft.question.explanation,
      skill_type: draft.question.skill_type,
      exam_type: draft.question.exam_type,
      cefr_level: draft.question.cefr_level,
      topic: draft.question.topic,
      trap_type: draft.question.trap_type,
      difficulty: draft.question.difficulty,
      transcript: draft.question.transcript,
      audio_url: draft.question.audio_url,
      passage_id: passageId,
      is_published: false,
      created_by: adminUserId,
    })
    .select("id")
    .single();

  if (questionError) {
    throw new Error(questionError.message);
  }

  return {
    passage_id: passageId,
    question_id: question.id,
  };
}
