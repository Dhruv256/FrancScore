import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { getServerEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const supabase = createAdminClient();
    const env = getServerEnv();
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_LISTENING_AUDIO_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error:
            "Audio upload failed. Make sure the configured Supabase Storage bucket exists and accepts uploads.",
          details: uploadError.message,
        },
        { status: 500 },
      );
    }

    const { data } = supabase.storage
      .from(env.SUPABASE_LISTENING_AUDIO_BUCKET)
      .getPublicUrl(path);
    return NextResponse.json({ path, publicUrl: data.publicUrl });
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audio upload failed." },
      { status: 500 },
    );
  }
}
