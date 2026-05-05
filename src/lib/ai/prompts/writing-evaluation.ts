import type { WritingEvaluation } from "@/lib/ai/schemas";

export function buildWritingEvaluationMessages(input: {
  promptTitle: string;
  promptText: string;
  criteria: string[];
  submissionText: string;
}) {
  return [
    {
      role: "system" as const,
      content:
        "You are FrancScore's French writing evaluator for TEF/TCF Canada. Return only valid JSON. Be strict, practical, and aligned to CEFR writing expectations.",
    },
    {
      role: "user" as const,
      content: [
        "Evaluate this French writing submission and return JSON with this exact shape:",
        '{"estimated_cefr":"B1_PLUS","score_20":13,"task_completion":0,"grammar_score":0,"vocabulary_score":0,"structure_score":0,"errors":[{"type":"grammar","original":"","correction":"","explanation":""}],"strengths":[],"weaknesses":[],"b2_rewrite":"","next_drill":""}',
        "",
        `Prompt title: ${input.promptTitle}`,
        `Prompt: ${input.promptText}`,
        `Criteria: ${input.criteria.join(", ")}`,
        "",
        "Student submission:",
        input.submissionText,
        "",
        "Rules:",
        "- Assess the French itself, not English.",
        "- Keep errors concrete and quote exact original snippets.",
        "- The B2 rewrite should be concise and realistic, not excessively long.",
        "- Return JSON only, with no markdown fences.",
      ].join("\n"),
    },
  ];
}

export function buildFallbackWritingEvaluation(input: {
  submissionText: string;
}): WritingEvaluation {
  const wordCount = input.submissionText.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = input.submissionText
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const hasConnectors = /(cependant|pourtant|néanmoins|toutefois|en outre|de plus)/i.test(
    input.submissionText,
  );

  const taskCompletion = clamp(35 + Math.min(wordCount, 220) * 0.2, 0, 100);
  const grammarScore = clamp(45 + sentenceCount * 3, 0, 100);
  const vocabularyScore = clamp(42 + (hasConnectors ? 18 : 8), 0, 100);
  const structureScore = clamp(40 + sentenceCount * 4, 0, 100);
  const aggregate = Math.round(
    taskCompletion * 0.3 +
      grammarScore * 0.25 +
      vocabularyScore * 0.2 +
      structureScore * 0.25,
  );

  return {
    estimated_cefr: aggregate >= 68 ? "B2" : aggregate >= 56 ? "B1_PLUS" : "B1",
    score_20: Math.max(6, Math.min(18, Math.round((aggregate / 100) * 20))),
    task_completion: Math.round(taskCompletion),
    grammar_score: Math.round(grammarScore),
    vocabulary_score: Math.round(vocabularyScore),
    structure_score: Math.round(structureScore),
    errors: [
      {
        type: "structure",
        original: "Overall response",
        correction: "Add clearer paragraph transitions and a stronger conclusion.",
        explanation: "This fallback review could not run the full AI rubric, so structure guidance is kept high level.",
      },
    ],
    strengths: hasConnectors
      ? ["Attempts to vary connectors", "Response shows some organization"]
      : ["Relevant response length", "Core idea is understandable"],
    weaknesses: [
      "Register and connector precision need another review pass.",
      "Sentence control should be checked against the task criteria.",
    ],
    b2_rewrite:
      "À mon avis, une réponse plus convaincante au niveau B2 devrait présenter une position claire, des arguments reliés par des connecteurs précis et une conclusion nette.",
    next_drill: "Rewrite this response with 3 formal connectors and one stronger concluding sentence.",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
