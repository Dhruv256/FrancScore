import postgres from "postgres";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}
const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
const run = async () => {
  const [totals] = await sql.unsafe("select count(*)::int as total, count(distinct topic)::int as themes from public.vocabulary where is_published=true and source='kwiziq_docx'");
  const levels = await sql.unsafe("select cefr_level,count(*)::int as count from public.vocabulary where is_published=true and source='kwiziq_docx' group by cefr_level order by cefr_level");
  const sample = await sql.unsafe("select french_word,english_meaning,cefr_level,topic from public.vocabulary where is_published=true and source='kwiziq_docx' order by created_at limit 3");
  console.log(JSON.stringify({ totals, levels, sample }, null, 2)); await sql.end();
};
run().catch((error) => { console.error(error); process.exitCode = 1; });
