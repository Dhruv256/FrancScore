import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";
import { createTTSProvider, TTSConfigurationError } from "../src/lib/audio/tts.ts";

type ListeningPassage = {
  id: string;
  title: string;
  transcript: string | null;
  content: string | null;
  audio_url: string | null;
};

type ListeningQuestion = {
  id: string;
  question_text: string;
  transcript: string | null;
  audio_url: string | null;
  passage_id: string | null;
};

loadEnvFile(".env.local");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = process.env.SUPABASE_LISTENING_AUDIO_BUCKET || "listening-audio";
  const limit = Number(process.env.AUDIO_GENERATION_LIMIT ?? "250");
  const provider = createTTSProvider();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  });

  const { data, error } = await supabase
    .from("passages")
    .select("id,title,transcript,content,audio_url")
    .eq("is_published", true)
    .eq("type", "listening")
    .is("audio_url", null)
    .limit(limit);

  if (error) {
    throw new Error(`Unable to fetch listening passages missing audio: ${error.message}`);
  }

  const report = {
    provider: provider.name,
    bucket,
    found: data?.length ?? 0,
    generated: 0,
    skipped: 0,
    failed: 0,
    failures: [] as Array<{ id: string; title: string; error: string }>,
  };

  for (const passage of (data ?? []) as ListeningPassage[]) {
    const transcript = (passage.transcript ?? passage.content ?? "").trim();
    if (!transcript) {
      report.skipped += 1;
      report.failures.push({
        id: passage.id,
        title: passage.title,
        error: "Missing transcript/content.",
      });
      continue;
    }

    try {
      const result = await provider.synthesizeSpeech({
        text: transcript,
        outputFormat: "audio/wav",
        voice: { language: "fr-FR" },
      });
      const objectPath = `generated/${passage.id}.wav`;
      const upload = await supabase.storage
        .from(bucket)
        .upload(objectPath, result.audio, {
          contentType: result.contentType,
          upsert: true,
        });

      if (upload.error) {
        throw new Error(upload.error.message);
      }

      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      const update = await supabase
        .from("passages")
        .update({ audio_url: publicUrl.publicUrl })
        .eq("id", passage.id);

      if (update.error) {
        throw new Error(update.error.message);
      }

      report.generated += 1;
    } catch (generationError) {
      report.failed += 1;
      report.failures.push({
        id: passage.id,
        title: passage.title,
        error:
          generationError instanceof Error
            ? generationError.message
            : "Unknown audio generation error.",
      });
    }
  }

  const { data: legacyQuestions, error: legacyError } = await supabase
    .from("questions")
    .select("id,question_text,transcript,audio_url,passage_id")
    .eq("is_published", true)
    .eq("skill_type", "LISTENING")
    .is("passage_id", null)
    .is("audio_url", null)
    .not("transcript", "is", null)
    .limit(limit);

  if (legacyError) {
    throw new Error(`Unable to fetch legacy listening questions missing audio: ${legacyError.message}`);
  }

  report.found += legacyQuestions?.length ?? 0;

  for (const question of (legacyQuestions ?? []) as ListeningQuestion[]) {
    const transcript = (question.transcript ?? "").trim();
    if (!transcript) {
      report.skipped += 1;
      report.failures.push({
        id: question.id,
        title: question.question_text,
        error: "Missing transcript.",
      });
      continue;
    }

    try {
      const result = await provider.synthesizeSpeech({
        text: transcript,
        outputFormat: "audio/wav",
        voice: { language: "fr-FR" },
      });
      const objectPath = `generated/questions/${question.id}.wav`;
      const upload = await supabase.storage
        .from(bucket)
        .upload(objectPath, result.audio, {
          contentType: result.contentType,
          upsert: true,
        });

      if (upload.error) {
        throw new Error(upload.error.message);
      }

      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      const update = await supabase
        .from("questions")
        .update({ audio_url: publicUrl.publicUrl })
        .eq("id", question.id);

      if (update.error) {
        throw new Error(update.error.message);
      }

      report.generated += 1;
    } catch (generationError) {
      report.failed += 1;
      report.failures.push({
        id: question.id,
        title: question.question_text,
        error:
          generationError instanceof Error
            ? generationError.message
            : "Unknown audio generation error.",
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
    throw new TTSConfigurationError(
      `${name} is required. Add it to .env.local or the shell environment before generating listening audio.`,
    );
  }
  return value;
}
