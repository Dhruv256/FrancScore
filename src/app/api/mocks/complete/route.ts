import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { completeMockTest } from "@/lib/mocks/server";
import { mockCompleteRequestSchema } from "@/lib/mocks/types";

export async function POST(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = mockCompleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid mock completion payload." },
      { status: 400 },
    );
  }

  try {
    const result = await completeMockTest(user.id, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete mock test." },
      { status: 500 },
    );
  }
}
