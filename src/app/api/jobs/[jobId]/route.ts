import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getProcessingJob } from "@/lib/jobs/server";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { user, profile } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId } = await context.params;
    const job = await getProcessingJob(jobId, user.id, profile?.role === "ADMIN");
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load job." },
      { status: 404 },
    );
  }
}
