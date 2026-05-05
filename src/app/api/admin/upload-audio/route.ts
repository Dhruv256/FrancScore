import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, profile } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const supabase = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("listening-audio")
    .upload(path, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error:
          "Audio upload failed. Make sure the Supabase Storage bucket 'listening-audio' exists and accepts uploads.",
        details: uploadError.message,
      },
      { status: 500 },
    );
  }

  const { data } = supabase.storage.from("listening-audio").getPublicUrl(path);
  return NextResponse.json({ path, publicUrl: data.publicUrl });
}
