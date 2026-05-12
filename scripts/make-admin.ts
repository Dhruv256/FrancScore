import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

loadEnvFile(".env.local");

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run make-admin -- user@example.com");
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const sql = postgres(requireEnv("DATABASE_URL"), {
    max: 1,
    ssl: "require",
  });

  try {
    const profiles = await sql<
      Array<{ id: string; email: string | null; role: string }>
    >`
      select id, email, role
      from public.profiles
      where lower(email) = lower(${email})
      limit 1
    `;

    const profile = profiles[0];

    if (!profile) {
      console.error("User must sign up once before being promoted to admin.");
      process.exit(1);
    }

    await sql`
      update public.profiles
      set role = 'ADMIN',
          updated_at = now()
      where id = ${profile.id}
    `;

    console.log(`Promoted ${profile.email ?? email} to ADMIN.`);
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
    // Environment variables may already be provided by the shell or CI.
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to promote an admin user.`);
  }
  return value;
}
