import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { formatSupabaseError } from "@/lib/errors/supabase-error";
import { reviewFlashcard } from "@/lib/flashcards/server";
import type { FlashcardReviewPayload } from "@/lib/flashcards/types";

export async function POST(request: Request) {
  const { user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<FlashcardReviewPayload>;

  if (
    typeof body.sessionId !== "string" ||
    typeof body.vocabularyId !== "string" ||
    !(
      body.rating === "AGAIN" ||
      body.rating === "HARD" ||
      body.rating === "GOOD" ||
      body.rating === "EASY"
    ) ||
    !(
      body.action === "RATE" ||
      body.action === "MARK_MASTERED" ||
      body.action === "SAVE_WEAK"
    )
  ) {
    return NextResponse.json({ error: "Invalid flashcard review payload." }, { status: 400 });
  }

  try {
    const data = await reviewFlashcard(user.id, {
      sessionId: body.sessionId,
      vocabularyId: body.vocabularyId,
      rating: body.rating,
      action: body.action,
    });

    return NextResponse.json(data);
  } catch (error) {
    const formatted = formatSupabaseError(error, {
      operation: "save flashcard review",
      table: "public.flashcard_reviews",
      env: "server",
    });
    return NextResponse.json(
      {
        error: formatted.userMessage,
        ...(process.env.NODE_ENV === "development"
          ? { details: formatted.developerMessage }
          : {}),
      },
      { status: 500 },
    );
  }
}
