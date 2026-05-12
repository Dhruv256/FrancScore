import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const saveSchema = z.object({
  itemId: z.string().uuid(),
  target: z.enum(["vocabulary", "questions", "listening", "writing", "speaking"]),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(
        {
          error:
            authError.status === 403
              ? "Only admins can publish book items into main practice banks."
              : authError.body.error,
        },
        { status: authError.status },
      );
    }
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { data: item, error } = await supabase
    .from("book_generated_items")
    .select("*")
    .eq("id", parsed.data.itemId)
    .single();

  if (error || !item) {
    return NextResponse.json({ error: error?.message ?? "Book item not found." }, { status: 404 });
  }

  const json = getJsonObject(item.item_json);

  try {
    if (parsed.data.target === "vocabulary") {
      await supabase.from("vocabulary").insert({
        french_word: String(json.front ?? "book item"),
        english_meaning: String(getJsonObject(json.back).english_meaning ?? "Review from book context."),
        french_example: String(getJsonObject(json.back).french_example ?? ""),
        english_example_translation: String(getJsonObject(json.back).english_translation ?? ""),
        cefr_level: item.cefr_level ?? "B1",
        topic: "education",
        exam_type: "BOTH",
        tags: item.tags ?? ["book"],
        is_published: true,
      });
    }

    if (parsed.data.target === "questions") {
      await supabase.from("questions").insert({
        skill_type: "READING",
        exam_type: "BOTH",
        cefr_level: item.cefr_level ?? "B1",
        topic: "education",
        difficulty: item.difficulty ?? "medium",
        question_text: String(json.question ?? json.prompt ?? "Book practice question"),
        options: Array.isArray(json.options) ? json.options : ["A", "B", "C", "D"],
        correct_answer_index: optionToIndex(String(json.correct_option ?? "A")),
        explanation: String(json.explanation ?? "Generated from French All-in-One book content."),
        tags: item.tags ?? ["book"],
        is_published: true,
      });
    }

    if (parsed.data.target === "listening") {
      const { data: passage } = await supabase
        .from("passages")
        .insert({
          title: "French All-in-One listening script",
          transcript: String(json.transcript ?? ""),
          audio_url: typeof json.audio_url === "string" ? json.audio_url : null,
          type: "listening",
          exam_type: "BOTH",
          skill: "LISTENING",
          cefr_level: item.cefr_level ?? "B1",
          topic: "education",
          is_published: true,
        })
        .select("*")
        .single();

      await supabase.from("questions").insert({
        passage_id: passage?.id ?? null,
        skill_type: "LISTENING",
        exam_type: "BOTH",
        cefr_level: item.cefr_level ?? "B1",
        topic: "education",
        difficulty: item.difficulty ?? "medium",
        question_text: String(json.question ?? "What is the main idea?"),
        options: Array.isArray(json.options) ? json.options : ["A", "B", "C", "D"],
        correct_answer_index: optionToIndex(String(json.correct_option ?? "A")),
        explanation: String(json.explanation ?? "Generated from French All-in-One book content."),
        tags: item.tags ?? ["book"],
        is_published: true,
      });
    }

    if (parsed.data.target === "writing") {
      await supabase.from("writing_prompts").insert({
        exam_type: "BOTH",
        task_type: "book_practice",
        cefr_level: item.cefr_level ?? "B1",
        title: "French All-in-One writing prompt",
        prompt_text: String(json.prompt ?? "Write using this book chapter."),
        target_word_min: Number(json.target_word_min ?? 120),
        target_word_max: Number(json.target_word_max ?? 180),
        is_published: true,
      });
    }

    if (parsed.data.target === "speaking") {
      await supabase.from("speaking_prompts").insert({
        exam_type: "BOTH",
        task_type: "book_practice",
        cefr_level: item.cefr_level ?? "B1",
        title: "French All-in-One speaking prompt",
        prompt_text: String(json.prompt ?? "Speak using this book chapter."),
        preparation_seconds: Number(json.preparation_seconds ?? 60),
        speaking_seconds: Number(json.speaking_seconds ?? 120),
        is_published: true,
      });
    }

    await supabase
      .from("book_generated_items")
      .update({ is_saved_to_practice_bank: true })
      .eq("id", item.id);

    return NextResponse.json({ ok: true });
  } catch (saveError) {
    return NextResponse.json(
      {
        error:
          saveError instanceof Error
            ? saveError.message
            : "Unable to save generated book item to practice bank.",
      },
      { status: 500 },
    );
  }
}

function optionToIndex(option: string) {
  const normalized = option.trim().toUpperCase();
  if (normalized === "B") return 1;
  if (normalized === "C") return 2;
  if (normalized === "D") return 3;
  return 0;
}

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
