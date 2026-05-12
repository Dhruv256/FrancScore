import { NextResponse } from "next/server";
import { getAdminAuthErrorResponse, requireAdmin } from "@/lib/auth/admin";
import { adminMutationSchema, adminSchemas } from "@/lib/admin/schemas";
import { listAdminResource } from "@/lib/admin/server";
import type { AdminResource } from "@/lib/admin/types";
import { formatSupabaseError } from "@/lib/errors/supabase-error";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_RESOURCES = new Set<AdminResource>([
  "passages",
  "listening",
  "questions",
  "vocabulary",
  "writing-prompts",
  "speaking-prompts",
  "badges",
  "mock-tests",
  "missions",
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  try {
    await requireAdmin();
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }
    throw error;
  }

  const { resource } = await context.params;
  if (!isValidResource(resource)) {
    return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  }

  const url = new URL(request.url);
  const filters = Object.fromEntries(url.searchParams.entries());

  try {
    const records = await listAdminResource(resource, filters);
    return NextResponse.json({ records });
  } catch (error) {
    const formatted = formatSupabaseError(error, {
      operation: `load admin resource ${resource}`,
      table: getResourceTableName(resource),
      env: "server",
    });
    return NextResponse.json(
      {
        error: formatted.userMessage,
        ...(process.env.NODE_ENV === "development"
          ? { details: formatted.developerMessage }
          : {}),
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  let adminUserId: string;
  try {
    const { user } = await requireAdmin();
    adminUserId = user.id;
  } catch (error) {
    const authError = getAdminAuthErrorResponse(error);
    if (authError) {
      return NextResponse.json(authError.body, { status: authError.status });
    }
    throw error;
  }

  const { resource } = await context.params;
  if (!isValidResource(resource)) {
    return NextResponse.json({ error: "Unknown admin resource." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsedMutation = adminMutationSchema.safeParse(body);
  if (!parsedMutation.success) {
    return NextResponse.json(
      { error: parsedMutation.error.issues[0]?.message ?? "Invalid mutation payload." },
      { status: 400 },
    );
  }

  const schema = adminSchemas[resource];
  const payload = (parsedMutation.data.payload ?? {}) as Record<string, unknown>;

  try {
    if (parsedMutation.data.action === "delete") {
      if (!parsedMutation.data.recordId) {
        return NextResponse.json({ error: "recordId is required for delete." }, { status: 400 });
      }
      await deleteRecord(resource, parsedMutation.data.recordId);
      return NextResponse.json({ ok: true });
    }

    const parsedPayload = schema.safeParse(payload);
    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: parsedPayload.error.issues[0]?.message ?? "Invalid form payload." },
        { status: 400 },
      );
    }

    if (parsedMutation.data.action === "create") {
      const record = await createRecord(
        resource,
        parsedPayload.data as Record<string, unknown>,
        adminUserId,
      );
      return NextResponse.json({ record });
    }

    if (!parsedMutation.data.recordId) {
      return NextResponse.json({ error: "recordId is required for update." }, { status: 400 });
    }

    const record = await updateRecord(
      resource,
      parsedMutation.data.recordId,
      parsedPayload.data as Record<string, unknown>,
      adminUserId,
    );
    return NextResponse.json({ record });
  } catch (error) {
    const formatted = formatSupabaseError(error, {
      operation: `save admin resource ${resource}`,
      table: getResourceTableName(resource),
      env: "server",
    });
    return NextResponse.json(
      {
        error: formatted.userMessage,
        ...(process.env.NODE_ENV === "development"
          ? { details: formatted.developerMessage }
          : {}),
      },
      { status: 500 },
    );
  }
}

function isValidResource(resource: string): resource is AdminResource {
  return VALID_RESOURCES.has(resource as AdminResource);
}

function getResourceTableName(resource: AdminResource) {
  switch (resource) {
    case "writing-prompts":
      return "public.writing_prompts";
    case "speaking-prompts":
      return "public.speaking_prompts";
    case "mock-tests":
      return "public.mock_tests";
    case "missions":
      return "public.daily_tasks";
    case "listening":
      return "public.questions";
    default:
      return `public.${resource}`;
  }
}

async function createRecord(resource: AdminResource, payload: Record<string, unknown>, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  switch (resource) {
    case "passages": {
      const { data, error } = await supabase
        .from("passages")
        .insert({ ...payload, created_by: userId })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "questions": {
      const { option_a, option_b, option_c, option_d, correct_option, ...rest } = payload;
      const { data, error } = await supabase
        .from("questions")
        .insert({
          ...rest,
          created_by: userId,
          options: [option_a, option_b, option_c, option_d],
          correct_answer_index: correct_option,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "listening": {
      const { question_id, option_a, option_b, option_c, option_d, correct_option, ...rest } = payload;
      const base = {
        ...rest,
        created_by: userId,
        skill_type: "LISTENING",
        options: [option_a, option_b, option_c, option_d],
        correct_answer_index: correct_option,
      };
      if (question_id && typeof question_id === "string") {
        const { data, error } = await supabase
          .from("questions")
          .update(base)
          .eq("id", question_id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
      const { data, error } = await supabase.from("questions").insert(base).select("*").single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "vocabulary": {
      const { data, error } = await supabase
        .from("vocabulary")
        .insert({ ...payload, created_by: userId })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "writing-prompts": {
      const { data, error } = await supabase
        .from("writing_prompts")
        .insert({ ...payload, created_by: userId })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "speaking-prompts": {
      const { data, error } = await supabase
        .from("speaking_prompts")
        .insert({ ...payload, created_by: userId })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "badges": {
      const { data, error } = await supabase
        .from("badges")
        .insert({ ...payload, created_by: userId })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "mock-tests": {
      const { sections, ...rest } = payload;
      const { data, error } = await supabase
        .from("mock_tests")
        .insert({ ...rest, created_by: userId })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await replaceMockSections(data.id, Array.isArray(sections) ? sections : []);
      return { ...data, sections };
    }
    case "missions": {
      const { data, error } = await supabase
        .from("daily_tasks")
        .insert({ ...payload, created_by: userId })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }
}

async function updateRecord(
  resource: AdminResource,
  recordId: string,
  payload: Record<string, unknown>,
  userId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  switch (resource) {
    case "passages": {
      const { data, error } = await supabase
        .from("passages")
        .update(payload)
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "questions": {
      const { option_a, option_b, option_c, option_d, correct_option, ...rest } = payload;
      const { data, error } = await supabase
        .from("questions")
        .update({
          ...rest,
          options: [option_a, option_b, option_c, option_d],
          correct_answer_index: correct_option,
        })
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "listening": {
      const { question_id, option_a, option_b, option_c, option_d, correct_option, ...rest } = payload;
      const targetId = typeof question_id === "string" ? question_id : recordId;
      const { data, error } = await supabase
        .from("questions")
        .update({
          ...rest,
          skill_type: "LISTENING",
          options: [option_a, option_b, option_c, option_d],
          correct_answer_index: correct_option,
        })
        .eq("id", targetId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "vocabulary": {
      const { data, error } = await supabase
        .from("vocabulary")
        .update(payload)
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "writing-prompts": {
      const { data, error } = await supabase
        .from("writing_prompts")
        .update(payload)
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "speaking-prompts": {
      const { data, error } = await supabase
        .from("speaking_prompts")
        .update(payload)
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "badges": {
      const { data, error } = await supabase
        .from("badges")
        .update(payload)
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "mock-tests": {
      const { sections, ...rest } = payload;
      const { data, error } = await supabase
        .from("mock_tests")
        .update({ ...rest, created_by: userId })
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await replaceMockSections(recordId, Array.isArray(sections) ? sections : []);
      return { ...data, sections };
    }
    case "missions": {
      const { data, error } = await supabase
        .from("daily_tasks")
        .update(payload)
        .eq("id", recordId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
  }
}

async function deleteRecord(resource: AdminResource, recordId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const table =
    resource === "writing-prompts"
      ? "writing_prompts"
      : resource === "speaking-prompts"
      ? "speaking_prompts"
      : resource === "mock-tests"
      ? "mock_tests"
      : resource === "missions"
      ? "daily_tasks"
      : resource === "listening"
      ? "questions"
      : resource;

  const { error } = await supabase.from(table).delete().eq("id", recordId);
  if (error) throw new Error(error.message);
}

async function replaceMockSections(mockTestId: string, sections: Array<Record<string, unknown>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any;
  const { error: deleteError } = await supabase
    .from("mock_test_sections")
    .delete()
    .eq("mock_test_id", mockTestId);
  if (deleteError) throw new Error(deleteError.message);

  if (!sections.length) return;

  const { error } = await supabase.from("mock_test_sections").insert(
    sections.map((section) => ({
      mock_test_id: mockTestId,
      skill_type: section.skill_type,
      sort_order: section.sort_order,
      question_count: section.question_count,
      duration_minutes: section.duration_minutes,
      metadata: section.metadata ?? {},
    })),
  );
  if (error) throw new Error(error.message);
}
