import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminResource } from "@/lib/admin/types";

export async function listAdminResource(resource: AdminResource, filters?: Record<string, string>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;

  switch (resource) {
    case "passages": {
      let query = supabase.from("passages").select("*").order("created_at", { ascending: false });
      query = applyStandardFilters(query, filters);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    }
    case "questions": {
      let query = supabase.from("questions").select("*").order("created_at", { ascending: false });
      query = applyStandardFilters(query, filters);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        option_a: Array.isArray(row.options) ? String(row.options[0] ?? "") : "",
        option_b: Array.isArray(row.options) ? String(row.options[1] ?? "") : "",
        option_c: Array.isArray(row.options) ? String(row.options[2] ?? "") : "",
        option_d: Array.isArray(row.options) ? String(row.options[3] ?? "") : "",
        correct_option: row.correct_answer_index,
      }));
    }
    case "listening": {
      let query = supabase
        .from("questions")
        .select("*")
        .eq("skill_type", "LISTENING")
        .order("created_at", { ascending: false });
      query = applyStandardFilters(query, filters);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        question_id: row.id,
        option_a: Array.isArray(row.options) ? String(row.options[0] ?? "") : "",
        option_b: Array.isArray(row.options) ? String(row.options[1] ?? "") : "",
        option_c: Array.isArray(row.options) ? String(row.options[2] ?? "") : "",
        option_d: Array.isArray(row.options) ? String(row.options[3] ?? "") : "",
        correct_option: row.correct_answer_index,
      }));
    }
    case "vocabulary": {
      let query = supabase.from("vocabulary").select("*").order("created_at", { ascending: false });
      query = applyStandardFilters(query, filters);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    }
    case "writing-prompts": {
      let query = supabase.from("writing_prompts").select("*").order("created_at", { ascending: false });
      query = applyStandardFilters(query, filters);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    }
    case "speaking-prompts": {
      let query = supabase.from("speaking_prompts").select("*").order("created_at", { ascending: false });
      query = applyStandardFilters(query, filters);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    }
    case "badges": {
      let query = supabase.from("badges").select("*").order("created_at", { ascending: false });
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    }
    case "mock-tests": {
      let query = supabase
        .from("mock_tests")
        .select("*, mock_test_sections(*)")
        .order("created_at", { ascending: false });
      if (filters?.exam_type) {
        query = query.eq("exam_type", filters.exam_type);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        sections: row.mock_test_sections ?? [],
        section_count: Array.isArray(row.mock_test_sections) ? row.mock_test_sections.length : 0,
      }));
    }
  }
}

function applyStandardFilters<TQuery extends {
  eq: (column: string, value: string | boolean) => TQuery;
  ilike: (column: string, pattern: string) => TQuery;
}>(query: TQuery, filters?: Record<string, string>) {
  if (!filters) return query;

  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    if (key === "search") {
      query = query.ilike("title", `%${value}%`);
      continue;
    }
    query = query.eq(key, value);
  }

  return query;
}
