import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { createRouteTimer } from "@/lib/observability/timing";
import {
  approveHighConfidencePdfImportItems,
  importApprovedPdfItems,
  processNextPdfImportChunk,
  setPdfImportItemStatus,
  updatePdfImportItem,
} from "@/lib/pdf-import/server";
import type { Json } from "@/lib/supabase/database.types";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const timer = createRouteTimer("POST /api/admin/pdf-import/[batchId]");
  const { batchId } = await context.params;

  try {
    await requireAdmin();
    const body = (await request.json()) as {
      action?: string;
      itemId?: string;
      status?: "approved" | "rejected" | "pending_review";
      title?: string;
      contentJson?: Json;
      confidence?: number;
      chunkId?: string;
    };

    if (body.action === "process_next") {
      const result = await processNextPdfImportChunk(batchId, body.chunkId);
      timer.step("processed_pdf_chunk");
      timer.done({ batch_id: batchId, action: body.action });
      return NextResponse.json(result);
    }

    if (body.action === "set_status" && body.itemId && body.status) {
      await setPdfImportItemStatus({ itemId: body.itemId, status: body.status });
      timer.done({ batch_id: batchId, action: body.action });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "edit_item" && body.itemId && body.contentJson) {
      await updatePdfImportItem({
        itemId: body.itemId,
        title: body.title ?? "",
        contentJson: body.contentJson,
        confidence: body.confidence ?? 0.5,
      });
      timer.done({ batch_id: batchId, action: body.action });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "approve_high_confidence") {
      const approvedCount = await approveHighConfidencePdfImportItems(batchId);
      timer.done({ batch_id: batchId, action: body.action, approvedCount });
      return NextResponse.json({ approvedCount });
    }

    if (body.action === "import_approved") {
      const result = await importApprovedPdfItems(batchId);
      timer.done({ batch_id: batchId, action: body.action });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unsupported PDF import action." }, { status: 400 });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    timer.done({ batch_id: batchId, failed: true });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF import action failed.",
      },
      { status: 500 },
    );
  }
}
