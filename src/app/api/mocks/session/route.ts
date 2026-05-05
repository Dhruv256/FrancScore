import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { loadMockSession } from "@/lib/mocks/server";

export async function GET(request: Request) {
  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mockTestId = url.searchParams.get("mockTestId");
  if (!mockTestId) {
    return NextResponse.json({ error: "mockTestId is required." }, { status: 400 });
  }

  try {
    const session = await loadMockSession(mockTestId, user.id);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load mock session." },
      { status: 500 },
    );
  }
}
