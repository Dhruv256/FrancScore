import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";

loadEnvFile(".env.local");

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  },
);

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const counts = {
    vocabulary: await count("vocabulary"),
    daily_tasks: await count("daily_tasks"),
    reading_passages: await count("passages", { type: "reading" }),
    reading_questions: await count("questions", { skill_type: "READING" }),
    listening_questions: await count("questions", { skill_type: "LISTENING" }),
    listening_passages: await count("passages", { type: "listening" }),
    listening_passages_missing_audio: await count("passages", { type: "listening", audio_url: null }),
    legacy_listening_questions_missing_audio: await count("questions", {
      skill_type: "LISTENING",
      passage_id: null,
      audio_url: null,
    }),
    writing_prompts: await count("writing_prompts"),
    speaking_prompts: await count("speaking_prompts"),
  };

  console.log(JSON.stringify(counts, null, 2));
}

async function count(table: string, filters: Record<string, string | null> = {}) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }

  const { count: rowCount, error } = await query;
  if (error) {
    throw new Error(`Unable to count ${table}: ${error.message}`);
  }

  return rowCount ?? 0;
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
    throw new Error(`${name} is required to report learning counts.`);
  }
  return value;
}
