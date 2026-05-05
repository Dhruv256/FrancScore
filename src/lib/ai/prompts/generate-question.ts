import type { GenerateQuestionRequest, GenerateQuestionResponse } from "@/lib/ai/schemas";

export function buildQuestionGenerationMessages(input: GenerateQuestionRequest) {
  return [
    {
      role: "system" as const,
      content:
        "You generate TEF/TCF Canada practice content for FrancScore. Return only valid JSON. Create plausible exam-style French content with one clearly correct MCQ option.",
    },
    {
      role: "user" as const,
      content: [
        "Return JSON with this exact shape:",
        '{"passage":{"title":"","content":"","estimated_minutes":2,"topic":"WORK","cefr_level":"B1_PLUS","exam_type":"TEF_CANADA"},"question":{"question_text":"","options":["","","",""],"correct_answer_index":0,"explanation":"","skill_type":"READING","exam_type":"TEF_CANADA","cefr_level":"B1_PLUS","topic":"WORK","trap_type":"NEGATION","difficulty":"MEDIUM","transcript":null,"audio_url":null}}',
        "",
        `Skill: ${input.skill}`,
        `Exam type: ${input.exam_type}`,
        `CEFR: ${input.cefr_level}`,
        `Topic: ${input.topic}`,
        `Trap type: ${input.trap_type ?? "None"}`,
        `Difficulty: ${input.difficulty}`,
        input.prompt_seed ? `Prompt seed: ${input.prompt_seed}` : "",
        "",
        "Rules:",
        "- The content must be in French.",
        "- For READING, include a short passage.",
        "- For LISTENING, set transcript to a short spoken script and audio_url to null.",
        "- Make distractors realistic.",
        "- The explanation must mention why the correct option is right and why a trap might fool the learner.",
        "- Return JSON only.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
}

export function buildFallbackGeneratedQuestion(
  input: GenerateQuestionRequest,
): GenerateQuestionResponse {
  const isReading = input.skill === "READING";
  const topicLabel = input.topic.toLowerCase().replaceAll("_", " ");
  const trapLabel = input.trap_type?.toLowerCase().replaceAll("_", " ") ?? "detail";

  return {
    passage: isReading
      ? {
          title: `Lecture - ${input.topic.replaceAll("_", " ")}`,
          content:
            `À Montréal, plusieurs nouveaux arrivants participent à un atelier sur ${topicLabel}. ` +
            "L'objectif est de mieux comprendre les démarches quotidiennes, d'éviter les erreurs fréquentes et de gagner du temps lors des prochaines étapes.",
          estimated_minutes: 2,
          topic: input.topic,
          cefr_level: input.cefr_level,
          exam_type: input.exam_type,
        }
      : null,
    question: {
      question_text: isReading
        ? "Quel est l'objectif principal de l'atelier ?"
        : "Quelle idée principale l'intervenant veut-il transmettre ?",
      options: [
        "Aider les participants à éviter les erreurs fréquentes",
        "Reporter les démarches à plus tard",
        "Comparer plusieurs villes canadiennes",
        "Présenter une publicité pour un nouveau service",
      ],
      correct_answer_index: 0,
      explanation:
        `The correct answer is the workshop's practical support goal. The main trap is ${trapLabel}, because learners may overfocus on a secondary detail instead of the stated objective.`,
      skill_type: input.skill,
      exam_type: input.exam_type,
      cefr_level: input.cefr_level,
      topic: input.topic,
      trap_type: input.trap_type ?? null,
      difficulty: input.difficulty,
      transcript: isReading
        ? null
        : "Bonjour à tous. Aujourd'hui, nous allons voir comment éviter les erreurs les plus fréquentes et organiser vos démarches plus efficacement.",
      audio_url: null,
    },
  };
}
