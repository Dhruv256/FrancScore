import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

loadEnvFile(".env.local");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npm run db:run -- path/to/file.sql");
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const sqlText = readFileSync(resolve(process.cwd(), filePath), "utf8");
  const sql = postgres(requireEnv("DATABASE_URL"), {
    max: 1,
    ssl: "require",
  });

  try {
    await sql.unsafe(sqlText);
    console.log(JSON.stringify({ filePath, applied: true }, null, 2));
  } finally {
    await sql.end();
  }
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
    throw new Error(`${name} is required to run SQL files.`);
  }
  return value;
}
