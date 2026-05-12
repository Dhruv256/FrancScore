import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { createPdfImportBatch } from "@/lib/pdf-import/server";

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a PDF file." }, { status: 400 });
    }

    const batchId = await createPdfImportBatch({ userId: user.id, file });
    return NextResponse.json({ batchId });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF import failed.",
      },
      { status: 500 },
    );
  }
}
