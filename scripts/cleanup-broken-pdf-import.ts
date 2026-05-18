import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

loadEnvFile(".env.local");

const tablesInDeleteOrder = [
  "user_book_answers",
  "user_book_progress",
  "book_import_reports",
  "book_generated_items",
  "book_notes",
  "book_chunks",
  "book_pages",
  "book_chapters",
  "book_sources",
  "source_generated_items",
  "user_source_progress",
  "source_chunks",
  "source_chapters",
  "study_sources",
  "pdf_import_items",
  "pdf_import_chunks",
  "pdf_import_batches",
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const sql = postgres(requireEnv("DATABASE_URL"), {
    max: 1,
    ssl: "require",
  });

  try {
    const report: Array<{ table: string; deleted: number | "missing" }> = [];

    for (const table of tablesInDeleteOrder) {
      if (!(await tableExists(sql, table))) {
        report.push({ table, deleted: "missing" });
        continue;
      }

      const deleted = await deleteAllRows(sql, table);
      report.push({ table, deleted });
    }

    const generatedExercisesDeleted = await deleteGeneratedExercises(sql);
    report.push({
      table: "generated_exercises(source_import_id not null)",
      deleted: generatedExercisesDeleted,
    });

    console.log(JSON.stringify({ cleaned: report }, null, 2));
  } finally {
    await sql.end();
  }
}

async function tableExists(sql: postgres.Sql, tableName: string) {
  const rows = await sql<Array<{ exists: boolean }>>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = ${tableName}
    )
  `;

  return rows[0]?.exists ?? false;
}

async function deleteAllRows(sql: postgres.Sql, tableName: string) {
  const rows = await sql.unsafe<Array<{ count: string }>>(
    `with deleted as (delete from public.${quoteIdentifier(tableName)} returning 1)
     select count(*)::text from deleted`,
  );

  return Number(rows[0]?.count ?? 0);
}

async function deleteGeneratedExercises(sql: postgres.Sql) {
  if (!(await tableExists(sql, "generated_exercises"))) {
    return "missing" as const;
  }

  const rows = await sql<Array<{ count: string }>>`
    with deleted as (
      delete from public.generated_exercises
      where source_import_id is not null
      returning 1
    )
    select count(*)::text from deleted
  `;

  return Number(rows[0]?.count ?? 0);
}

function quoteIdentifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error(`Unsafe table name: ${value}`);
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function loadEnvFile(fileName: string) {
  const envPath = resolve(process.cwd(), fileName);
  try {
    const contents = readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // The caller may provide env vars through the shell instead.
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for PDF/book cleanup.`);
  }
  return value;
}
