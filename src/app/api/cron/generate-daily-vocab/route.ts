import { NextResponse } from "next/server";
import { generateDailyVocabularyBatch } from "@/lib/ai/generate-daily-vocab";
import { getServerEnv } from "@/lib/env/server";

export async function GET(request: Request) {
  const env = getServerEnv();

  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron vocabulary generation is not configured." }, { status: 404 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
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
