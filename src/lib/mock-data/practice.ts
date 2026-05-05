import type {
  MockTest,
  MockTestResult,
  Passage,
  Question,
  SpeakingPrompt,
  WritingPrompt,
} from "@/lib/types";

export const mockListeningQuestions: Question[] = [
  {
    id: "lq_001",
    skillType: "LISTENING",
    audioUrl: "/audio/listening_001.mp3",
    question:
      "D'après le dialogue, la réunion n'a PAS été annulée. Que s'est-il passé ?",
    options: [
      "La réunion a été reportée à la semaine prochaine",
      "La réunion a été annulée",
      "La réunion aura lieu comme prévu",
      "La réunion a été avancée",
    ],
    correctAnswer: 0,
    trapType: "NEGATION",
    explanation:
      "The speaker uses a double negation structure: 'n'a pas été annulée' means it was not cancelled. The correct answer is that it was postponed.",
    cefrLevel: "B1_PLUS",
    examType: "TEF_CANADA",
    topicType: "WORK",
    difficulty: "MEDIUM",
    tags: ["negation", "double-negative", "work"],
  },
  {
    id: "lq_002",
    skillType: "LISTENING",
    audioUrl: "/audio/listening_002.mp3",
    question: "Le locuteur dit que le rendez-vous est à quelle heure ?",
    options: ["14h30", "15h30", "14h15", "15h15"],
    correctAnswer: 1,
    trapType: "NUMBER_DATE",
    explanation:
      "The speaker initially mentions 14h30 but then corrects themselves to 15h30. Many students pick the first number they hear.",
    cefrLevel: "B1",
    examType: "ALL_EXAMS",
    topicType: "DAILY_LIFE",
    difficulty: "EASY",
    tags: ["number", "time", "correction"],
  },
  {
    id: "lq_003",
    skillType: "LISTENING",
    audioUrl: "/audio/listening_003.mp3",
    question: "Quel est le sentiment du locuteur envers le nouveau règlement ?",
    options: [
      "Il est entièrement favorable",
      "Il est favorable mais avec des réserves",
      "Il est totalement opposé",
      "Il n'a pas d'opinion",
    ],
    correctAnswer: 1,
    trapType: "CONTRAST_MARKER",
    explanation:
      "The speaker uses 'certes... mais', which signals partial agreement with reservations.",
    cefrLevel: "B2",
    examType: "TEF_CANADA",
    topicType: "OPINION",
    difficulty: "HARD",
    tags: ["contrast", "opinion", "nuance"],
  },
];

export const mockReadingPassages: Passage[] = [
  {
    id: "rp_001",
    title: "L'immigration au Canada : Un nouveau départ",
    content: `Le Canada accueille chaque année des milliers d'immigrants francophones, notamment dans le cadre du programme d'immigration francophone. Ces nouveaux arrivants contribuent à la diversité culturelle et économique du pays.

Néanmoins, le parcours d'intégration n'est pas sans défis. Les immigrants doivent souvent faire face à des obstacles linguistiques, malgré leur maîtrise du français. En effet, les expressions idiomatiques canadiennes et le vocabulaire technique lié à certaines professions peuvent représenter des barrières inattendues.

Par ailleurs, la reconnaissance des diplômes étrangers reste un enjeu majeur. Bien que le gouvernement ait mis en place des programmes de soutien, le processus peut s'avérer long et complexe. Cependant, de nombreuses ressources sont disponibles pour accompagner les immigrants dans leurs démarches.

En outre, les communautés francophones jouent un rôle essentiel dans l'accueil et l'intégration des nouveaux arrivants. Des organismes comme les centres d'accueil francophone offrent des services d'aide à l'emploi, au logement et à l'apprentissage de la culture canadienne.`,
    questions: [
      {
        id: "rq_001",
        skillType: "READING",
        examType: "ALL_EXAMS",
        cefrLevel: "B2",
        topicType: "IMMIGRATION",
        difficulty: "MEDIUM",
        question:
          "Selon le texte, quels types d'obstacles linguistiques rencontrent les immigrants francophones ?",
        options: [
          "L'impossibilité de parler français",
          "Les expressions idiomatiques et le vocabulaire technique",
          "Le refus des Canadiens de parler français",
          "L'absence de cours de français",
        ],
        correctAnswer: 1,
        explanation:
          "The passage specifically mentions idiomatic expressions and technical vocabulary as unexpected barriers.",
        tags: ["immigration", "vocabulary", "reading"],
        passageId: "rp_001",
      },
      {
        id: "rq_002",
        skillType: "READING",
        examType: "ALL_EXAMS",
        cefrLevel: "B2",
        topicType: "IMMIGRATION",
        difficulty: "HARD",
        question:
          "Quel est le ton du texte concernant la reconnaissance des diplômes ?",
        options: [
          "Très optimiste",
          "Réaliste mais nuancé",
          "Entièrement négatif",
          "Indifférent",
        ],
        correctAnswer: 1,
        explanation:
          "The text acknowledges the difficulty but also notes available support, showing a balanced view.",
        trapType: "CONTRAST_MARKER",
        tags: ["immigration", "tone", "nuance"],
        passageId: "rp_001",
      },
    ],
    cefrLevel: "B2",
    examType: "ALL_EXAMS",
    topicType: "IMMIGRATION",
    wordCount: 198,
    estimatedMinutes: 8,
    highlightedVocabulary: [
      "néanmoins",
      "malgré",
      "en effet",
      "par ailleurs",
      "cependant",
      "en outre",
      "démarches",
    ],
  },
];

export const mockWritingPrompts: WritingPrompt[] = [
  {
    id: "wp_001",
    title: "Lettre formelle : Demande de logement",
    prompt:
      "Vous venez d'arriver au Canada et vous cherchez un logement. Écrivez une lettre formelle au propriétaire d'un appartement pour exprimer votre intérêt, poser des questions sur les conditions de location et demander une visite.",
    type: "FORMAL_LETTER",
    cefrLevel: "B2",
    examType: "TEF_CANADA",
    topicType: "HOUSING",
    wordLimit: { min: 150, max: 250 },
    criteria: [
      "Formal greeting and closing",
      "Clear structure with paragraphs",
      "Appropriate register",
      "Use of formal connectors",
      "Polite request formulations",
    ],
  },
  {
    id: "wp_002",
    title: "Essai : L'importance de l'éducation",
    prompt:
      "Pensez-vous que l'éducation est le facteur le plus important pour réussir dans la vie ? Présentez votre opinion en donnant des arguments et des exemples concrets.",
    type: "ESSAY",
    cefrLevel: "B2",
    examType: "ALL_EXAMS",
    topicType: "EDUCATION",
    wordLimit: { min: 200, max: 300 },
    criteria: [
      "Clear thesis statement",
      "Structured argumentation",
      "Concrete examples",
      "Appropriate connectors",
      "Conclusion that summarizes",
    ],
  },
];

export const mockSpeakingPrompts: SpeakingPrompt[] = [
  {
    id: "sp_001",
    title: "Monologue : Votre expérience professionnelle",
    prompt:
      "Décrivez votre parcours professionnel. Parlez de votre formation, de vos expériences de travail et de vos projets pour l'avenir au Canada.",
    type: "MONOLOGUE",
    cefrLevel: "B1_PLUS",
    examType: "TEF_CANADA",
    topicType: "WORK",
    durationSeconds: 120,
    preparationSeconds: 30,
    criteria: [
      "Clear chronological structure",
      "Appropriate past tenses",
      "Professional vocabulary",
      "Future plans expression",
      "Fluency and pronunciation",
    ],
  },
  {
    id: "sp_002",
    title: "Opinion : Télétravail",
    prompt:
      "Êtes-vous pour ou contre le télétravail ? Donnez votre opinion en présentant des arguments pour et contre, puis expliquez votre position personnelle.",
    type: "OPINION",
    cefrLevel: "B2",
    examType: "ALL_EXAMS",
    topicType: "WORK",
    durationSeconds: 180,
    preparationSeconds: 60,
    criteria: [
      "Clear opinion statement",
      "Arguments for and against",
      "Use of opinion expressions",
      "Appropriate connectors",
      "Personal conclusion",
    ],
  },
];

export const mockTests: MockTest[] = [
  {
    id: "mt_001",
    title: "TEF Full Mock #1",
    examType: "TEF_CANADA",
    sections: [
      { skill: "LISTENING", questionCount: 40, duration: 40 },
      { skill: "READING", questionCount: 50, duration: 60 },
      { skill: "WRITING", questionCount: 2, duration: 60 },
      { skill: "SPEAKING", questionCount: 2, duration: 15 },
    ],
    totalDuration: 175,
    isCompleted: true,
    completedAt: "2026-05-01",
  },
  {
    id: "mt_002",
    title: "TCF Full Mock #1",
    examType: "TCF_CANADA",
    sections: [
      { skill: "LISTENING", questionCount: 29, duration: 25 },
      { skill: "READING", questionCount: 29, duration: 45 },
      { skill: "WRITING", questionCount: 3, duration: 60 },
      { skill: "SPEAKING", questionCount: 3, duration: 12 },
    ],
    totalDuration: 142,
    isCompleted: false,
  },
  {
    id: "mt_003",
    title: "Mixed Mock #1",
    examType: "MIXED",
    sections: [
      { skill: "LISTENING", questionCount: 35, duration: 35 },
      { skill: "READING", questionCount: 40, duration: 50 },
      { skill: "WRITING", questionCount: 2, duration: 60 },
      { skill: "SPEAKING", questionCount: 2, duration: 15 },
    ],
    totalDuration: 160,
    isCompleted: false,
  },
];

export const mockTestResult: MockTestResult = {
  testId: "mt_001",
  overallScore: 62,
  cefrEstimate: "B1_PLUS",
  skills: [
    {
      skill: "LISTENING",
      score: 58,
      cefrEstimate: "B1",
      weakAreas: ["Negation traps", "Number/date confusion"],
    },
    {
      skill: "READING",
      score: 74,
      cefrEstimate: "B1_PLUS",
      weakAreas: ["Implicit meaning", "Long passage fatigue"],
    },
    {
      skill: "WRITING",
      score: 52,
      cefrEstimate: "B1_MINUS",
      weakAreas: ["Formal register", "Connector variety", "Structure"],
    },
    {
      skill: "SPEAKING",
      score: 48,
      cefrEstimate: "B1_MINUS",
      weakAreas: ["Fluency", "Pronunciation", "Tense accuracy"],
    },
  ],
  repairPlan: [
    {
      day: 1,
      tasks: [
        {
          title: "Negation Trap Drill",
          skill: "LISTENING",
          description: "Focus on identifying negation patterns",
          estimatedMinutes: 20,
        },
        {
          title: "Connector Practice",
          skill: "WRITING",
          description: "Practice using B2 connectors in sentences",
          estimatedMinutes: 15,
        },
      ],
    },
    {
      day: 2,
      tasks: [
        {
          title: "Number/Date Listening",
          skill: "LISTENING",
          description: "Practice with time, date, and number traps",
          estimatedMinutes: 15,
        },
        {
          title: "Speaking Fluency Drill",
          skill: "SPEAKING",
          description: "Record 3 short monologues",
          estimatedMinutes: 20,
        },
      ],
    },
    {
      day: 3,
      tasks: [
        {
          title: "Reading Comprehension",
          skill: "READING",
          description: "Practice with implicit meaning questions",
          estimatedMinutes: 25,
        },
        {
          title: "Formal Writing",
          skill: "WRITING",
          description: "Write a formal letter with proper register",
          estimatedMinutes: 25,
        },
      ],
    },
  ],
  completedAt: "2026-05-01",
};
