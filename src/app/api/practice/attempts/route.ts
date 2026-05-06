import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { formatSupabaseError } from "@/lib/errors/supabase-error";
import { submitPracticeAttempt } from "@/lib/practice/server";
import type { PracticeAttemptRequest } from "@/lib/practice/types";

export async function POST(request: Request) {
  const { user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<PracticeAttemptRequest>;

  if (
    typeof body.questionId !== "string" ||
    typeof body.selectedAnswerIndex !== "number" ||
    typeof body.timeTakenSeconds !== "number" ||
    (body.mode !== "learning" && body.mode !== "timed")
  ) {
    return NextResponse.json({ error: "Invalid attempt payload." }, { status: 400 });
  }

  try {
    const data = await submitPracticeAttempt(user.id, {
      questionId: body.questionId,
      selectedAnswerIndex: body.selectedAnswerIndex,
      timeTakenSeconds: Math.max(0, Math.round(body.timeTakenSeconds)),
      mode: body.mode,
    });

    return NextResponse.json(data);
  } catch (error) {
    const formatted = formatSupabaseError(error, {
      operation: "save practice attempt",
      table: "public.attempts",
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
