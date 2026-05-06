type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number | null;
};

type SupabaseErrorContext = {
  operation: string;
  table?: string;
  schema?: string;
  env?: "client" | "server";
};

export type FormattedSupabaseError = {
  category:
    | "missing_table"
    | "missing_column"
    | "rls"
    | "env"
    | "duplicate"
    | "foreign_key"
    | "unknown";
  code: string | null;
  table: string | null;
  userMessage: string;
  developerMessage: string;
  likelyFix: string;
};

const SCHEMA_RELOAD_HINT = "Run the latest Supabase migration and then NOTIFY pgrst, 'reload schema';";

export function formatSupabaseError(
  error: unknown,
  context: SupabaseErrorContext,
): FormattedSupabaseError {
  const supabaseError = toSupabaseLikeError(error);
  const code = supabaseError.code ?? null;
  const message = supabaseError.message ?? getFallbackMessage(error);
  const details = supabaseError.details ?? null;
  const hint = supabaseError.hint ?? null;
  const table = detectTableName(message, context.table, context.schema);
  const envMode = process.env.NODE_ENV;

  if (isMissingTableError(code, message)) {
    const missingTable = table ?? context.table ?? "public.unknown_table";
    return buildResult({
      category: "missing_table",
      code,
      table: missingTable,
      context,
      message,
      details,
      hint,
      userMessage: `Database schema missing: ${missingTable}. Apply the latest Supabase migration and run NOTIFY pgrst, 'reload schema';`,
      likelyFix:
        `The ${missingTable} table is missing from the live Supabase project or PostgREST has stale schema metadata. ` +
        SCHEMA_RELOAD_HINT,
      envMode,
    });
  }

  if (isMissingColumnError(code, message)) {
    const columnMatch = message.match(/column ['"]?([a-zA-Z0-9_.]+)['"]?/i);
    const missingColumn = columnMatch?.[1] ?? "unknown_column";
    const resolvedTable = table ?? context.table ?? "public.unknown_table";
    return buildResult({
      category: "missing_column",
      code,
      table: resolvedTable,
      context,
      message,
      details,
      hint,
      userMessage: `Database column missing: ${resolvedTable}.${missingColumn}. Apply the latest Supabase migration and refresh the schema cache.`,
      likelyFix:
        `The app expected ${resolvedTable}.${missingColumn}. Apply the latest migration for ${resolvedTable} and reload the Supabase schema cache.`,
      envMode,
    });
  }

  if (isRlsError(code, message)) {
    const resolvedTable = table ?? context.table ?? "the requested table";
    return buildResult({
      category: "rls",
      code,
      table: resolvedTable,
      context,
      message,
      details,
      hint,
      userMessage: `Permission error while accessing ${resolvedTable}. Check the authenticated user and row-level security policies.`,
      likelyFix:
        `The active session could not satisfy the RLS policy on ${resolvedTable}. Verify auth.uid() matches the record owner or use the admin client only on secure server routes.`,
      envMode,
    });
  }

  if (isEnvError(message, context)) {
    return buildResult({
      category: "env",
      code,
      table,
      context,
      message,
      details,
      hint,
      userMessage:
        "Supabase environment is not configured correctly. Verify the project URL, anon key, and server-side service role configuration.",
      likelyFix:
        "Check NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and server-only Supabase keys. Make sure client code never receives the service role key.",
      envMode,
    });
  }

  if (code === "23505" || /duplicate key/i.test(message)) {
    const resolvedTable = table ?? context.table ?? "the requested table";
    return buildResult({
      category: "duplicate",
      code,
      table: resolvedTable,
      context,
      message,
      details,
      hint,
      userMessage: `A duplicate record prevented ${context.operation}. Please retry after checking for an existing ${resolvedTable} record.`,
      likelyFix:
        `A unique constraint rejected the write on ${resolvedTable}. Confirm the upsert conflict target or reuse the existing row instead of creating a duplicate.`,
      envMode,
    });
  }

  if (code === "23503" || /foreign key/i.test(message)) {
    const resolvedTable = table ?? context.table ?? "the requested table";
    return buildResult({
      category: "foreign_key",
      code,
      table: resolvedTable,
      context,
      message,
      details,
      hint,
      userMessage: `A related record is missing, so ${context.operation} could not be completed.`,
      likelyFix:
        `A foreign key on ${resolvedTable} rejected this write. Verify the referenced user, profile, prompt, question, or vocabulary record exists first.`,
      envMode,
    });
  }

  return buildResult({
    category: "unknown",
    code,
    table,
    context,
    message,
    details,
    hint,
    userMessage: `Unable to ${context.operation}. Please try again.`,
    likelyFix:
      "Review the operation, Supabase response code, and live schema state. If this is a new deployment, confirm the latest migration was applied.",
    envMode,
  });
}

function buildResult(input: {
  category: FormattedSupabaseError["category"];
  code: string | null;
  table: string | null;
  context: SupabaseErrorContext;
  message: string;
  details: string | null;
  hint: string | null;
  userMessage: string;
  likelyFix: string;
  envMode: string | undefined;
}): FormattedSupabaseError {
  const location = input.table ?? input.context.table ?? "unknown";
  const developerMessage = [
    `${input.context.operation} failed${location ? ` on ${location}` : ""}.`,
    `code=${input.code ?? "none"}`,
    `message=${input.message}`,
    input.details ? `details=${input.details}` : null,
    input.hint ? `hint=${input.hint}` : null,
    `likely_fix=${input.likelyFix}`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    category: input.category,
    code: input.code,
    table: input.table,
    userMessage: input.envMode === "development" ? developerMessage : input.userMessage,
    developerMessage,
    likelyFix: input.likelyFix,
  };
}

function toSupabaseLikeError(error: unknown): SupabaseLikeError {
  if (error && typeof error === "object") {
    return error as SupabaseLikeError;
  }

  return {};
}

function getFallbackMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Supabase error.";
}

function isMissingTableError(code: string | null, message: string) {
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /schema cache/i.test(message) ||
    /could not find the table/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

function isMissingColumnError(code: string | null, message: string) {
  return (
    code === "42703" ||
    code === "PGRST204" ||
    /could not find the column/i.test(message) ||
    /column .* does not exist/i.test(message)
  );
}

function isRlsError(code: string | null, message: string) {
  return (
    code === "42501" ||
    /row-level security/i.test(message) ||
    /permission denied/i.test(message)
  );
}

function isEnvError(message: string, context: SupabaseErrorContext) {
  return (
    /NEXT_PUBLIC_SUPABASE_URL/i.test(message) ||
    /NEXT_PUBLIC_SUPABASE_ANON_KEY/i.test(message) ||
    /SUPABASE_SERVICE_ROLE_KEY/i.test(message) ||
    /Invalid .*environment/i.test(message) ||
    /Invalid API key/i.test(message) ||
    (context.env === "server" && /service-role/i.test(message))
  );
}

function detectTableName(message: string, fallbackTable?: string, schema = "public") {
  const match =
    message.match(/table ['"]([^'"]+)['"]/i) ??
    message.match(/relation ['"]([^'"]+)['"]/i) ??
    message.match(/on ([a-z0-9_]+\.[a-z0-9_]+)/i);

  if (match?.[1]) {
    return match[1].includes(".") ? match[1] : `${schema}.${match[1]}`;
  }

  return fallbackTable ?? null;
}
