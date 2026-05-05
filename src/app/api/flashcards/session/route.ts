import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import {
  completeFlashcardSession,
  startFlashcardSession,
} from "@/lib/flashcards/server";
import type { FlashcardSessionPayload } from "@/lib/flashcards/types";

export async function POST(request: Request) {
  const { user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<FlashcardSessionPayload>;

  if (
    typeof body.totalCards !== "number" ||
    !(
      body.deckType === "ALL" ||
      body.deckType === "WEAK_WORDS" ||
      body.deckType === "HIGH_FREQUENCY" ||
      body.deckType === "TOPIC" ||
      body.deckType === "TRAP_WORDS" ||
      body.deckType === "CONNECTORS" ||
      body.deckType === "LISTENING_TRAPS" ||
      body.deckType === "CUSTOM"
    )
  ) {
    return NextResponse.json({ error: "Invalid flashcard session payload." }, { status: 400 });
  }

  try {
    const data = await startFlashcardSession(user.id, {
      deckType: body.deckType,
      totalCards: body.totalCards,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start flashcard session.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const { user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { sessionId?: string };

  if (typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }

  try {
    await completeFlashcardSession(body.sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to complete flashcard session.",
      },
      { status: 500 },
    );
  }
}
