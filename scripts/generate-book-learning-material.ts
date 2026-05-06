import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";

type ChapterRow = {
  id: string;
  book_source_id: string;
  chapter_number: number | null;
  title: string;
  cefr_level: string | null;
  skill_focus: string[] | null;
  order_index: number | null;
};

type ChunkRow = {
  id: string;
  chapter_id: string;
  chunk_text: string;
  page_start: number | null;
  page_end: number | null;
  headings: string[] | null;
};

type GeneratedItem = {
  item_type: string;
  item_json: Record<string, unknown>;
  difficulty?: string;
  cefr_level?: string;
  tags?: string[];
  source_chunk_id?: string | null;
};

loadEnvFile(".env.local");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket },
    },
  );

  const { data: source, error: sourceError } = await supabase
    .from("book_sources")
    .select("*")
    .eq("title", "Complete French All-in-One")
    .eq("is_active", true)
    .maybeSingle();

  if (sourceError) {
    throw new Error(`Unable to load book source. Apply migration/import first. ${sourceError.message}`);
  }
  if (!source) {
    throw new Error("No book imported yet. Run npm run import:book first.");
  }

  let chapterQuery = supabase
    .from("book_chapters")
    .select("*")
    .eq("book_source_id", source.id)
    .order("order_index", { ascending: true });

  if (args.chapter) {
    chapterQuery = chapterQuery.eq("chapter_number", Number(args.chapter));
  } else if (!args.all) {
    chapterQuery = chapterQuery.limit(1);
  }

  const { data: chapters, error: chapterError } = await chapterQuery;
  if (chapterError) throw new Error(`Unable to load chapters: ${chapterError.message}`);
  if (!chapters?.length) throw new Error("No matching chapters found for material generation.");

  const report = {
    source: source.title,
    mode: args.all ? "all" : args.chapter ? `chapter ${args.chapter}` : "first chapter",
    chaptersProcessed: 0,
    notesGenerated: 0,
    generatedItemsCreated: 0,
    skippedChapters: [] as string[],
    generatedAt: new Date().toISOString(),
  };

  for (const chapter of chapters as ChapterRow[]) {
    const existing = await countExistingMaterial(supabase, chapter.id);
    if (existing.notes > 0 && existing.items > 0 && !args.refresh) {
      report.skippedChapters.push(`${chapter.chapter_number ?? chapter.order_index}: ${chapter.title}`);
      continue;
    }

    const { data: chunks, error: chunkError } = await supabase
      .from("book_chunks")
      .select("*")
      .eq("chapter_id", chapter.id)
      .order("chunk_index", { ascending: true });

    if (chunkError) throw new Error(`Unable to load chunks for ${chapter.title}: ${chunkError.message}`);
    if (!chunks?.length) {
      report.skippedChapters.push(`${chapter.title} (no chunks)`);
      continue;
    }

    const material = createExtractiveChapterMaterial(chapter, chunks as ChunkRow[]);
    const { error: notesError } = await supabase.from("book_notes").upsert(
      material.notes.map((note) => ({
        book_source_id: chapter.book_source_id,
        chapter_id: chapter.id,
        note_type: note.note_type,
        title: note.title,
        content_md: note.content_md,
        key_points: note.key_points,
        examples: note.examples,
        cefr_level: chapter.cefr_level ?? "B1",
      })),
      { onConflict: "chapter_id,note_type" },
    );

    if (notesError) throw new Error(`Unable to save notes for ${chapter.title}: ${notesError.message}`);

    const existingItems = existing.items > 0 && !args.refresh;
    if (!existingItems) {
      const { error: itemError } = await supabase.from("book_generated_items").insert(
        material.items.map((item) => ({
          book_source_id: chapter.book_source_id,
          chapter_id: chapter.id,
          source_chunk_id: item.source_chunk_id ?? null,
          item_type: item.item_type,
          item_json: item.item_json,
          difficulty: item.difficulty ?? "medium",
          cefr_level: item.cefr_level ?? chapter.cefr_level ?? "B1",
          tags: item.tags ?? ["book", "french-all-in-one"],
        })),
      );

      if (itemError) throw new Error(`Unable to save generated items for ${chapter.title}: ${itemError.message}`);
      report.generatedItemsCreated += material.items.length;
    }

    report.notesGenerated += material.notes.length;
    report.chaptersProcessed += 1;
  }

  console.log(JSON.stringify(report, null, 2));
  if (!args.all && !args.chapter) {
    console.log("Tip: run npm run generate:book-material -- --all to process every chapter.");
  }
}

async function countExistingMaterial(supabase: ReturnType<typeof createClient>, chapterId: string) {
  const [{ count: notes }, { count: items }] = await Promise.all([
    supabase.from("book_notes").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId),
    supabase.from("book_generated_items").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId),
  ]);

  return { notes: notes ?? 0, items: items ?? 0 };
}

function createExtractiveChapterMaterial(chapter: ChapterRow, chunks: ChunkRow[]) {
  const sourceText = chunks.map((chunk) => chunk.chunk_text).join("\n\n");
  const sentences = splitSentences(sourceText);
  const keySentences = sentences.slice(0, 18);
  const vocabulary = extractFrenchTerms(sourceText).slice(0, 24);
  const examples = keySentences.slice(0, 6).map((sentence) => ({ text: sentence }));
  const keyPoints = keySentences.slice(0, 8);
  const tags = ["book", "french-all-in-one", ...(chapter.skill_focus ?? [])];

  const notes = [
    {
      note_type: "chapter_summary",
      title: `Chapter summary: ${chapter.title}`,
      content_md: [
        `# ${chapter.title}`,
        "",
        "This summary is generated from the imported private PDF text and is scoped to this internal FrancScore book module.",
        "",
        ...keySentences.slice(0, 5).map((sentence) => `- ${sentence}`),
      ].join("\n"),
      key_points: keyPoints,
      examples,
    },
    {
      note_type: "detailed_notes",
      title: `Detailed notes: ${chapter.title}`,
      content_md: buildDetailedNotes(chapter, keySentences, vocabulary),
      key_points: keyPoints,
      examples,
    },
    {
      note_type: "grammar_explanation",
      title: `Grammar explanation: ${chapter.title}`,
      content_md: buildGrammarNotes(chapter, keySentences),
      key_points: keyPoints.slice(0, 5),
      examples,
    },
    {
      note_type: "vocabulary_notes",
      title: `Vocabulary notes: ${chapter.title}`,
      content_md: vocabulary.map((term) => `- **${term}**: review this form in the chapter context.`).join("\n"),
      key_points: vocabulary,
      examples,
    },
    {
      note_type: "exam_application",
      title: `TEF/TCF application: ${chapter.title}`,
      content_md: [
        "Use this chapter for TEF/TCF preparation by turning the rules and examples into active recall:",
        "",
        "- explain the rule aloud in French",
        "- write two original examples",
        "- identify traps in question wording",
        "- reuse the chapter vocabulary in a Canada immigration/work/housing context",
      ].join("\n"),
      key_points: ["active recall", "exam transfer", "B1/B2 accuracy"],
      examples,
    },
    {
      note_type: "common_mistakes",
      title: `Common mistakes: ${chapter.title}`,
      content_md: buildMistakes(chapter, vocabulary),
      key_points: vocabulary.slice(0, 8),
      examples,
    },
    {
      note_type: "revision_notes",
      title: `Revision checklist: ${chapter.title}`,
      content_md: [
        "- I can summarize the chapter in my own words.",
        "- I can recognize the key forms in a reading passage.",
        "- I can produce at least five correct examples.",
        "- I can answer MCQs without looking at the notes.",
        "- I can use the chapter in a TEF/TCF-style writing or speaking task.",
      ].join("\n"),
      key_points: ["summarize", "recognize", "produce", "transfer"],
      examples,
    },
  ];

  const items: GeneratedItem[] = [
    ...vocabulary.slice(0, 16).map((term, index) => ({
      item_type: "flashcard",
      item_json: {
        front: term,
        back: {
          english_meaning: "Review from chapter context.",
          french_example: findSentenceContaining(sentences, term) ?? keySentences[index % keySentences.length] ?? term,
          english_translation: "Translate and personalize this example during review.",
        },
      },
      tags,
      source_chunk_id: chunks[index % chunks.length]?.id,
    })),
    ...keySentences.slice(0, 8).map((sentence, index) => createMcq(sentence, chapter, chunks[index % chunks.length]?.id)),
    ...vocabulary.slice(0, 8).map((term, index) => createFillBlank(term, sentences, chunks[index % chunks.length]?.id, tags)),
    ...keySentences.slice(0, 6).map((sentence, index) => ({
      item_type: "translation_drill",
      item_json: {
        source_language: "fr",
        prompt: sentence,
        expected_answer: "Translate this chapter sentence into natural English, preserving tense and register.",
        notes: "Generated from the imported chapter text for private study.",
      },
      tags,
      source_chunk_id: chunks[index % chunks.length]?.id,
    })),
    {
      item_type: "speaking_prompt",
      item_json: {
        prompt: `Explain the main idea of "${chapter.title}" aloud, then create two original examples in French.`,
        preparation_seconds: 60,
        speaking_seconds: 120,
      },
      tags: [...tags, "speaking"],
    },
    {
      item_type: "writing_prompt",
      item_json: {
        prompt: `Write a short TEF/TCF-style paragraph using the key ideas from "${chapter.title}". Include connectors and at least three examples from the chapter.`,
        target_word_min: 120,
        target_word_max: 180,
      },
      tags: [...tags, "writing"],
    },
    {
      item_type: "listening_script",
      item_json: {
        transcript: buildListeningScript(chapter, vocabulary),
        tts_ready: true,
        audio_url: null,
        question: `What is the main study focus of "${chapter.title}"?`,
        options: ["Grammar accuracy", "Random memorization", "Ignoring examples", "Skipping review"],
        correct_option: "Grammar accuracy",
        explanation: "The listening script is designed to reinforce the imported chapter focus.",
      },
      tags: [...tags, "listening"],
    },
    {
      item_type: "revision_question",
      item_json: {
        question: `What are the three most important things to remember from "${chapter.title}"?`,
        expected_points: keyPoints.slice(0, 3),
      },
      tags: [...tags, "revision"],
    },
  ];

  return { notes, items };
}

function buildDetailedNotes(chapter: ChapterRow, keySentences: string[], vocabulary: string[]) {
  return [
    `# Detailed notes: ${chapter.title}`,
    "",
    "## What to learn",
    ...keySentences.slice(0, 8).map((sentence) => `- ${sentence}`),
    "",
    "## Key forms and vocabulary",
    ...vocabulary.slice(0, 12).map((term) => `- ${term}`),
    "",
    "## Study move",
    "Turn each rule into a French sentence, then transform it into a question, negative form, or past/future tense where relevant.",
  ].join("\n");
}

function buildGrammarNotes(chapter: ChapterRow, keySentences: string[]) {
  return [
    `# Grammar focus: ${chapter.title}`,
    "",
    "Read the imported examples slowly and identify the form, function, and agreement pattern.",
    "",
    ...keySentences.slice(0, 6).map((sentence, index) => `${index + 1}. ${sentence}`),
  ].join("\n");
}

function buildMistakes(chapter: ChapterRow, vocabulary: string[]) {
  return [
    `# Common mistakes: ${chapter.title}`,
    "",
    "- Translating word-for-word from English.",
    "- Forgetting agreement, tense, or register changes.",
    "- Memorizing an isolated form without an example sentence.",
    "- Missing small connector words that change meaning.",
    "",
    "Watch these chapter terms closely:",
    ...vocabulary.slice(0, 10).map((term) => `- ${term}`),
  ].join("\n");
}

function createMcq(sentence: string, chapter: ChapterRow, sourceChunkId?: string): GeneratedItem {
  return {
    item_type: "mcq",
    item_json: {
      question: `Based on this chapter extract, what should you focus on? "${sentence.slice(0, 220)}"`,
      options: [
        "The grammar or vocabulary pattern in context",
        "Only the English translation",
        "Skipping examples",
        "Ignoring register and agreement",
      ],
      correct_option: "A",
      explanation: "The item is generated from the imported chapter text and checks contextual understanding.",
      skill: chapter.skill_focus?.[0] ?? "grammar",
      trap_type: "context",
      cefr_level: chapter.cefr_level ?? "B1",
    },
    cefr_level: chapter.cefr_level ?? "B1",
    tags: ["book", "mcq", ...(chapter.skill_focus ?? [])],
    source_chunk_id: sourceChunkId,
  };
}

function createFillBlank(term: string, sentences: string[], sourceChunkId?: string, tags: string[] = []): GeneratedItem {
  const sentence = findSentenceContaining(sentences, term) ?? `Revise ${term} in context.`;
  return {
    item_type: "fill_blank",
    item_json: {
      prompt: sentence.replace(new RegExp(escapeRegex(term), "i"), "_____"),
      answer: term,
      explanation: "Use the surrounding context to recover the missing French term.",
    },
    tags: [...tags, "fill-blank"],
    source_chunk_id: sourceChunkId,
  };
}

function buildListeningScript(chapter: ChapterRow, vocabulary: string[]) {
  return [
    `Aujourd'hui, nous révisons le chapitre "${chapter.title}".`,
    "Écoutez les exemples, puis répétez les formes importantes à voix haute.",
    vocabulary.slice(0, 6).length
      ? `Les mots clés à surveiller sont: ${vocabulary.slice(0, 6).join(", ")}.`
      : "Concentrez-vous sur la règle principale et créez vos propres exemples.",
    "Après l'écoute, écrivez deux phrases originales pour vérifier votre compréhension.",
  ].join(" ");
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45 && sentence.length <= 260)
    .slice(0, 80);
}

function extractFrenchTerms(text: string) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "you",
    "your",
    "les",
    "des",
    "une",
    "pour",
    "dans",
    "avec",
    "plus",
    "page",
  ]);
  const matches = text.match(/\b[A-Za-zÀ-ÖØ-öø-ÿ'’-]{4,}\b/g) ?? [];
  const counts = new Map<string, number>();
  for (const match of matches) {
    const term = match.toLowerCase().replace(/[’']/g, "'");
    if (stopWords.has(term) || /^\d+$/.test(term)) continue;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([term]) => term)
    .slice(0, 40);
}

function findSentenceContaining(sentences: string[], term: string) {
  return sentences.find((sentence) => sentence.toLowerCase().includes(term.toLowerCase())) ?? null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseArgs(args: string[]) {
  const parsed: Record<string, string | boolean | undefined> = {};
  for (const arg of args) {
    const [key, ...valueParts] = arg.replace(/^--/, "").split("=");
    parsed[key] = valueParts.length ? valueParts.join("=") : true;
  }
  return parsed;
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
    throw new Error(`${name} is required. Add it to .env.local or the shell environment.`);
  }
  return value;
}
