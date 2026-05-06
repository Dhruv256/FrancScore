import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type TTSVoice = {
  language?: string;
  voice?: string;
};

export type TTSRequest = {
  text: string;
  outputFormat?: "audio/wav";
  voice?: TTSVoice;
};

export type TTSResult = {
  contentType: "audio/wav";
  audio: Buffer;
};

export interface TTSProvider {
  name: string;
  synthesizeSpeech(request: TTSRequest): Promise<TTSResult>;
}

export class TTSConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TTSConfigurationError";
  }
}

export function createTTSProvider(providerName = process.env.TTS_PROVIDER ?? "windows-sapi"): TTSProvider {
  if (providerName === "windows-sapi") {
    return new WindowsSapiTTSProvider();
  }

  throw new TTSConfigurationError(
    `Unsupported TTS_PROVIDER "${providerName}". Configure TTS_PROVIDER=windows-sapi on Windows, or add a concrete provider in src/lib/audio/tts.ts.`,
  );
}

class WindowsSapiTTSProvider implements TTSProvider {
  name = "windows-sapi";

  async synthesizeSpeech(request: TTSRequest): Promise<TTSResult> {
    if (process.platform !== "win32") {
      throw new TTSConfigurationError(
        "Windows SAPI TTS is only available on Windows. Configure another TTS provider before running audio generation here.",
      );
    }

    const text = request.text.trim();
    if (!text) {
      throw new TTSConfigurationError("Cannot generate listening audio because the transcript is empty.");
    }

    const tempDir = await mkdtemp(join(tmpdir(), "francscore-tts-"));
    const outputPath = join(tempDir, "listening.wav");
    const scriptPath = join(tempDir, "synthesize.ps1");
    const language = request.voice?.language ?? "fr-FR";
    const escapedLanguage = language.replace(/'/g, "''");

    const script = [
      "param([string]$out, [string]$text)",
      "Add-Type -AssemblyName System.Speech",
      "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
      `$culture = [System.Globalization.CultureInfo]::GetCultureInfo('${escapedLanguage}')`,
      "try { $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, $culture) } catch { }",
      "$synth.Rate = -1",
      "$synth.Volume = 100",
      "$synth.SetOutputToWaveFile($out)",
      "$synth.Speak($text)",
      "$synth.Dispose()",
    ].join("\n");

    try {
      await writeFile(scriptPath, script, "utf8");
      await runPowerShellFile(scriptPath, [outputPath, text]);
      return {
        contentType: "audio/wav",
        audio: await readFile(outputPath),
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

function runPowerShellFile(scriptPath: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
      { windowsHide: true },
    );
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new TTSConfigurationError(`Windows SAPI TTS failed with exit code ${code}: ${stderr.trim()}`));
    });
  });
}
