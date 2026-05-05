import type { SpeakingEvaluation } from "@/lib/ai/schemas";

export function buildSpeakingEvaluationMessages(input: {
  promptTitle: string;
  promptText: string;
  criteria: string[];
  transcript: string;
}) {
  return [
    {
      role: "system" as const,
      content:
        "You are FrancScore's French speaking evaluator for TEF/TCF Canada. Evaluate from transcript evidence only. Return only valid JSON.",
    },
    {
      role: "user" as const,
      content: [
        "Evaluate this French speaking transcript and return JSON with this exact shape:",
        '{"estimated_cefr":"B1_PLUS","score_20":12,"fluency_score":0,"grammar_score":0,"vocabulary_score":0,"structure_score":0,"task_relevance_score":0,"feedback":"","repeated_words":[],"better_phrases":[],"next_drill":""}',
        "",
        `Prompt title: ${input.promptTitle}`,
        `Prompt: ${input.promptText}`,
        `Criteria: ${input.criteria.join(", ")}`,
        "",
        "Transcript:",
        input.transcript,
        "",
        "Rules:",
        "- Do not invent pronunciation details you cannot hear from a transcript.",
        "- Focus on fluency signals visible in transcript structure, repetition, and filler use.",
        "- Return JSON only, with no markdown fences.",
      ].join("\n"),
    },
  ];
}

export function buildFallbackSpeakingEvaluation(input: {
  transcript: string;
}): SpeakingEvaluation {
  const words = input.transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const fillerMatches =
    input.transcript.match(/\b(euh|ben|donc|alors|comment dire)\b/gi)?.length ?? 0;
  const uniqueRatio = wordCount ? new Set(words.map((word) => word.toLowerCase())).size / wordCount : 0;

  const fluency = clamp(70 - fillerMatches * 8, 30, 90);
  const grammar = clamp(48 + uniqueRatio * 35, 30, 88);
  const vocabulary = clamp(45 + uniqueRatio * 40, 30, 90);
  const structure = clamp(40 + Math.min(wordCount, 180) * 0.18, 30, 90);
  const relevance = clamp(55 + Math.min(wordCount, 140) * 0.2, 35, 92);
  const overall = Math.round(
    fluency * 0.2 + grammar * 0.2 + vocabulary * 0.2 + structure * 0.2 + relevance * 0.2,
  );

  return {
    estimated_cefr: overall >= 68 ? "B2" : overall >= 56 ? "B1_PLUS" : "B1",
    score_20: Math.max(6, Math.min(18, Math.round((overall / 100) * 20))),
    fluency_score: Math.round(fluency),
    grammar_score: Math.round(grammar),
    vocabulary_score: Math.round(vocabulary),
    structure_score: Math.round(structure),
    task_relevance_score: Math.round(relevance),
    feedback:
      "This fallback review used transcript heuristics because the AI evaluator was unavailable. Focus on clearer structure and reducing repeated fillers.",
    repeated_words: getRepeatedWords(words),
    better_phrases: [
      "En ce qui me concerne",
      "Il convient de souligner que",
      "Dans un premier temps",
    ],
    next_drill: "Re-record the response with a 3-part structure: introduction, example, conclusion.",
  };
}

function getRepeatedWords(words: string[]) {
  const counts = new Map<string, number>();
  for (const word of words.map((item) => item.toLowerCase())) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([word, count]) => count >= 3 && word.length > 3)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
