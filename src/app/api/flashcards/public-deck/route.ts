/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams; const limit = Math.min(50, Math.max(1, Number(p.get("limit") ?? 20)));
  const supabase = await createClient(); let query = (supabase as any).from("vocabulary").select("id,french_word,english_meaning,cefr_level,topic,category_slug,broad_category").eq("is_published", true);
  const level = p.get("level"); const topic = p.get("topic"); const category = p.get("category");
  if (level && level !== "ALL") query = query.eq("cefr_level", level); if (topic && topic !== "ALL") query = query.eq("topic", topic); if (category && category !== "ALL") query = query.eq("broad_category", category);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ cards: data ?? [] });
}
