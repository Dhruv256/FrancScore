import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getFlashcardDeck } from "@/lib/flashcards/server";
import type { FlashcardDeckFilter } from "@/lib/flashcards/types";

export async function GET(request: Request) {
  const { user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const filter: FlashcardDeckFilter = {
    deckType: normalizeDeckType(searchParams.get("deckType")),
    cefrLevel: normalizeCefrLevel(searchParams.get("cefrLevel")),
    topic: normalizeTopic(searchParams.get("topic")),
    examType: normalizeExamType(searchParams.get("examType")),
    status: normalizeStatus(searchParams.get("status")),
  };

  try {
    const data = await getFlashcardDeck(user.id, filter);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load flashcard deck.",
      },
      { status: 500 },
    );
  }
}

function normalizeDeckType(value: string | null): FlashcardDeckFilter["deckType"] {
  if (
    value === "ALL" ||
    value === "WEAK_WORDS" ||
    value === "HIGH_FREQUENCY" ||
    value === "TOPIC" ||
    value === "TRAP_WORDS" ||
    value === "CONNECTORS" ||
    value === "LISTENING_TRAPS" ||
    value === "CUSTOM"
  ) {
    return value;
  }

  return "ALL";
}

function normalizeCefrLevel(value: string | null): FlashcardDeckFilter["cefrLevel"] {
  if (
    value === "A1" ||
    value === "A2" ||
    value === "B1_MINUS" ||
    value === "B1" ||
    value === "B1_PLUS" ||
    value === "B2_MINUS" ||
    value === "B2" ||
    value === "B2_PLUS" ||
    value === "C1"
  ) {
    return value;
  }

  return "ALL";
}

function normalizeTopic(value: string | null): FlashcardDeckFilter["topic"] {
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

  return "ALL";
}

function normalizeExamType(value: string | null): FlashcardDeckFilter["examType"] {
  if (value === "TEF_CANADA" || value === "TCF_CANADA" || value === "MIXED") {
    return value;
  }

  return "ALL";
}

function normalizeStatus(value: string | null): FlashcardDeckFilter["status"] {
  if (
    value === "NEW" ||
    value === "LEARNING" ||
    value === "WEAK" ||
    value === "MASTERED"
  ) {
    return value;
  }

  return "ALL";
}
