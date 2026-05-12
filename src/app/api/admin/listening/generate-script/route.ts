import { NextResponse } from "next/server";
import { generateListeningScript } from "@/lib/ai/generate-listening-script";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as {
      topic?: string;
      trapType?: string;
      cefrLevel?: string;
    };
    const { script, modelUsed } = await generateListeningScript(body);
    const supabase = createAdminClient();

    const { data: passage, error: passageError } = await supabase
      .from("passages")
      .insert({
        title: script.title,
        content: "",
        transcript: script.transcript,
        audio_url: null,
        audio_source: "pending_upload_or_tts",
        accent: script.accent,
        speed: script.speed,
        type: "listening",
        skill: "LISTENING",
        exam_type: script.exam_type,
        cefr_level: script.cefr_level,
        topic: script.topic,
        is_published: false,
      })
      .select("id")
      .single();

    if (passageError || !passage) {
      throw new Error(passageError?.message ?? "Unable to create listening passage.");
    }

    const { error: questionError } = await supabase.from("questions").insert({
      passage_id: passage.id,
      question_text: script.question,
      options: script.options,
      correct_answer_index: script.correct_answer_index,
      explanation: script.explanation,
      transcript: script.transcript,
      audio_url: null,
      skill_type: "LISTENING",
      exam_type: script.exam_type,
      cefr_level: script.cefr_level,
      topic: script.topic,
      trap_type: script.trap_type,
      tags: [...new Set(["ai-listening-script", ...script.tags])],
      is_published: false,
    });

    if (questionError) {
      throw new Error(questionError.message);
    }

    return NextResponse.json({
      ok: true,
      passageId: passage.id,
      modelUsed,
      message: "Listening script created as unpublished content. Upload/generate unique audio before publishing.",
    });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate listening script." },
      { status: 500 },
    );
  }
}
