import { NextResponse } from "next/server";
import { generateDailyVocabularyBatch } from "@/lib/ai/generate-daily-vocab";
import { getAuthContext } from "@/lib/auth";

export async function POST() {
  const { profile } = await getAuthContext();

  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const summary = await generateDailyVocabularyBatch();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Daily vocabulary generation failed.",
      },
      { status: 500 },
    );
  }
}
