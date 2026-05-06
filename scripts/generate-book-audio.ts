import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";
import { createTTSProvider, TTSConfigurationError } from "../src/lib/audio/tts.ts";

type BookListeningItem = {
  id: string;
  item_json: {
    transcript?: string;
    audio_url?: string | null;
    [key: string]: unknown;
  };
};

loadEnvFile(".env.local");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const provider = createTTSProvider();
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket },
    },
  );
  const bucket = process.env.SUPABASE_LISTENING_AUDIO_BUCKET ?? "listening-audio";
  const limit = Number(process.env.BOOK_AUDIO_GENERATION_LIMIT ?? "100");

  const { data, error } = await supabase
    .from("book_generated_items")
    .select("id,item_json")
    .eq("item_type", "listening_script")
    .limit(limit);

  if (error) {
    throw new Error(`Unable to fetch book listening scripts: ${error.message}`);
  }

  const candidates = ((data ?? []) as BookListeningItem[]).filter(
    (item) => item.item_json.transcript && !item.item_json.audio_url,
  );

  const report = {
    provider: provider.name,
    bucket,
    found: candidates.length,
    generated: 0,
    failed: 0,
    failures: [] as Array<{ id: string; error: string }>,
  };

  for (const item of candidates) {
    try {
      const result = await provider.synthesizeSpeech({
        text: item.item_json.transcript ?? "",
        outputFormat: "audio/wav",
        voice: { language: "fr-FR" },
      });
      const objectPath = `book/${item.id}.wav`;
      const upload = await supabase.storage.from(bucket).upload(objectPath, result.audio, {
        contentType: result.contentType,
        upsert: true,
      });

      if (upload.error) {
        throw new Error(upload.error.message);
      }

      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      const update = await supabase
        .from("book_generated_items")
        .update({
          item_json: {
            ...item.item_json,
            audio_url: publicUrl.publicUrl,
            audio_generated_at: new Date().toISOString(),
          },
        })
        .eq("id", item.id);

      if (update.error) {
        throw new Error(update.error.message);
      }

      report.generated += 1;
    } catch (generationError) {
      report.failed += 1;
      report.failures.push({
        id: item.id,
        error:
          generationError instanceof Error
            ? generationError.message
            : "Unknown book audio generation error.",
      });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

function loadEnvFile(fileName: string) {
  const envPath = resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) return;
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
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new TTSConfigurationError(`${name} is required for book audio generation.`);
  }
  return value;
}
