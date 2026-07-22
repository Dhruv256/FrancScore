/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams; const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize") ?? 50))); const from = (page - 1) * pageSize;
  const search = params.get("search")?.trim(); const level = params.get("level"); const topic = params.get("topic"); const category = params.get("category");
  const supabase = await createClient();
  let query = (supabase as any).from("vocabulary").select("id,french_word,english_meaning,cefr_level,topic,category_slug,broad_category", { count: "exact" }).eq("is_published", true);
  if (search) query = query.or(`french_word.ilike.%${search}%,english_meaning.ilike.%${search}%`);
  if (level && level !== "ALL") query = query.eq("cefr_level", level);
  if (topic && topic !== "ALL") query = query.eq("topic", topic);
  if (category && category !== "ALL") query = query.eq("broad_category", category);
  const { data, count, error } = await query.order("french_word", { ascending: true }).range(from, from + pageSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, pageSize });
}
