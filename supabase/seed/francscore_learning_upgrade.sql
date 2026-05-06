-- FrancScore learning depth upgrade.
-- Original TEF/TCF-style educational content. Safe to rerun.

insert into public.daily_tasks (
  id, title, description, skill_type, task_type, xp_reward, estimated_minutes,
  icon, exam_type, cefr_level, target_count, is_published
)
values
  ('89000000-0000-4000-8000-000000000001', 'Review 15 flashcards', 'Strengthen today''s recall queue with real vocabulary cards.', 'VOCABULARY', 'flashcards', 70, 8, 'Library', 'BOTH', 'B1', 15, true),
  ('89000000-0000-4000-8000-000000000002', 'Complete 1 listening prompt', 'Train one audio trap and review the transcript after answering.', 'LISTENING', 'listening', 50, 6, 'Headphones', 'BOTH', 'B1', 1, true),
  ('89000000-0000-4000-8000-000000000003', 'Complete 1 reading question', 'Read one richer passage and answer its comprehension question.', 'READING', 'reading', 45, 7, 'BookOpen', 'BOTH', 'B1', 1, true),
  ('89000000-0000-4000-8000-000000000004', 'Submit 1 writing response', 'Write a short response and send it to the writing coach.', 'WRITING', 'writing', 90, 18, 'PenTool', 'BOTH', 'B1_PLUS', 1, true),
  ('89000000-0000-4000-8000-000000000005', 'Complete 1 speaking prompt', 'Record one structured response and review the feedback.', 'SPEAKING', 'speaking', 90, 15, 'Mic', 'BOTH', 'B1_PLUS', 1, true),
  ('89000000-0000-4000-8000-000000000006', 'Finish 2 weakness questions', 'Target recent trap types with focused repair practice.', 'READING', 'weakness_quest', 80, 12, 'Target', 'BOTH', 'B2', 2, true)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    task_type = excluded.task_type,
    target_count = excluded.target_count,
    xp_reward = excluded.xp_reward,
    is_published = excluded.is_published;

insert into public.weakness_quests (
  id, title, description, skill_type, trap_type, questions_count, target_count,
  xp_reward, difficulty, exam_type, cefr_level, is_published
)
values
  ('89100000-0000-4000-8000-000000000001', 'Negation repair', 'Practice ne...plus, ne...jamais, sans, and ni...ni traps.', 'LISTENING', 'NEGATION', 8, 2, 90, 'MEDIUM', 'BOTH', 'B1_PLUS', true),
  ('89100000-0000-4000-8000-000000000002', 'Number and date repair', 'Train corrected times, prices, deadlines, and appointment dates.', 'LISTENING', 'NUMBER_DATE', 8, 2, 90, 'MEDIUM', 'BOTH', 'B1_PLUS', true),
  ('89100000-0000-4000-8000-000000000003', 'Contrast marker repair', 'Read and hear pourtant, cependant, toutefois, certes, and en revanche.', 'READING', 'CONTRAST_MARKER', 8, 2, 90, 'MEDIUM', 'BOTH', 'B2', true),
  ('89100000-0000-4000-8000-000000000004', 'Implicit meaning repair', 'Infer intent, tone, and practical consequences from context.', 'READING', 'IMPLICIT_MEANING', 8, 2, 110, 'HARD', 'BOTH', 'B2', true)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    questions_count = excluded.questions_count,
    target_count = excluded.target_count,
    xp_reward = excluded.xp_reward,
    is_published = excluded.is_published;

with vocab_topics(topic, french_domain, english_domain, tags) as (
  values
    ('IMMIGRATION', 'dossier', 'immigration file', array['immigration','administration']),
    ('HOUSING', 'bail', 'lease', array['housing','formal']),
    ('WORK', 'entretien', 'job interview', array['work','formal']),
    ('HEALTH', 'suivi medical', 'medical follow-up', array['health','appointment']),
    ('ADMINISTRATION', 'guichet', 'service counter', array['administration','formal']),
    ('EDUCATION', 'formation', 'training program', array['education','study']),
    ('DAILY_LIFE', 'trajet', 'daily commute', array['daily_life','practical']),
    ('OPINION', 'mesure', 'public measure', array['opinion','argumentation']),
    ('TRAVEL', 'correspondance', 'connection', array['travel','listening-trap']),
    ('TECHNOLOGY', 'demarche en ligne', 'online procedure', array['technology','administration']),
    ('CULTURE', 'activite locale', 'local activity', array['culture','community']),
    ('ENVIRONMENT', 'collecte selective', 'recycling collection', array['environment','civic'])
),
vocab_patterns(french_prefix, english_prefix, cefr_level, frequency_score, extra_tags) as (
  values
    ('la preuve de', 'proof of', 'B1', 86, array['high-frequency']),
    ('le delai de', 'deadline for', 'B1_PLUS', 84, array['time','listening-trap']),
    ('une demande de', 'request for', 'B1', 88, array['high-frequency']),
    ('un justificatif de', 'supporting document for', 'B2', 82, array['administration']),
    ('le refus de', 'refusal of', 'B2', 78, array['formal']),
    ('la prise en charge de', 'handling of', 'B2', 76, array['formal']),
    ('le report de', 'postponement of', 'B1_PLUS', 83, array['time','listening-trap']),
    ('une hausse de', 'increase in', 'B2', 79, array['opinion']),
    ('une baisse de', 'decrease in', 'B2', 79, array['opinion']),
    ('la mise a jour de', 'update of', 'B1_PLUS', 81, array['technology']),
    ('une contrainte liee au', 'constraint related to', 'B2', 77, array['argumentation']),
    ('une solution durable pour le', 'sustainable solution for', 'B2', 75, array['argumentation']),
    ('le manque de', 'lack of', 'B1_PLUS', 85, array['negation','listening-trap']),
    ('l''acces au', 'access to', 'B1_PLUS', 82, array['civic']),
    ('la priorite donnee au', 'priority given to', 'B2', 74, array['formal']),
    ('un rendez-vous concernant le', 'appointment about', 'B1', 87, array['time','listening-trap'])
),
vocab_rows as (
  select
    trim(vocab_patterns.french_prefix || ' ' || vocab_topics.french_domain) as french_word,
    trim(vocab_patterns.english_prefix || ' ' || vocab_topics.english_domain) as english_meaning,
    'Le candidat explique clairement ' || lower(vocab_patterns.french_prefix || ' ' || vocab_topics.french_domain) || ' pendant son echange.' as french_example,
    'The candidate clearly explains the ' || lower(vocab_patterns.english_prefix || ' ' || vocab_topics.english_domain) || ' during the exchange.' as english_example_translation,
    vocab_patterns.cefr_level,
    vocab_topics.topic,
    'BOTH' as exam_type,
    vocab_patterns.frequency_score,
    (vocab_topics.tags || vocab_patterns.extra_tags)::text[] as tags
  from vocab_topics
  cross join vocab_patterns
),
connector_rows(french_word, english_meaning, french_example, english_example_translation, cefr_level, topic, exam_type, frequency_score, tags) as (
  values
    ('pourtant', 'however / yet', 'Il voulait partir tot, pourtant il est arrive en retard.', 'He wanted to leave early, yet he arrived late.', 'B1', 'OPINION', 'BOTH', 96, array['connector','contrast']),
    ('cependant', 'however', 'Le logement est petit; cependant, il reste bien situe.', 'The housing is small; however, it remains well located.', 'B1_PLUS', 'HOUSING', 'BOTH', 94, array['connector','contrast']),
    ('toutefois', 'nevertheless', 'La mesure est utile; toutefois, son cout pose question.', 'The measure is useful; nevertheless, its cost raises questions.', 'B2', 'OPINION', 'BOTH', 92, array['connector','contrast']),
    ('en revanche', 'on the other hand', 'Le trajet est long; en revanche, le quartier est calme.', 'The commute is long; on the other hand, the area is quiet.', 'B1_PLUS', 'DAILY_LIFE', 'BOTH', 93, array['connector','contrast']),
    ('ainsi', 'therefore / thus', 'Elle a garde tous les recus; ainsi, son dossier est complet.', 'She kept all receipts; thus, her file is complete.', 'B1', 'ADMINISTRATION', 'BOTH', 91, array['connector','consequence']),
    ('desormais', 'from now on', 'Desormais, les demandes se font en ligne.', 'From now on, applications are done online.', 'B2', 'ADMINISTRATION', 'BOTH', 84, array['connector','time']),
    ('faute de', 'for lack of', 'Faute de justificatif, le dossier sera retarde.', 'For lack of supporting document, the file will be delayed.', 'B2', 'ADMINISTRATION', 'BOTH', 82, array['connector','cause']),
    ('a condition que', 'provided that', 'Vous pouvez changer la date a condition que le service confirme.', 'You can change the date provided that the office confirms.', 'B2', 'ADMINISTRATION', 'BOTH', 81, array['connector','condition'])
)
insert into public.vocabulary (
  french_word, english_meaning, french_example, english_example_translation,
  cefr_level, topic, exam_type, frequency_score, tags, is_published
)
select french_word, english_meaning, french_example, english_example_translation,
       cefr_level, topic, exam_type, frequency_score, tags, true
from (
  select * from vocab_rows
  union all
  select * from connector_rows
) rows
where not exists (
  select 1
  from public.vocabulary existing
  where lower(existing.french_word) = lower(rows.french_word)
    and lower(existing.english_meaning) = lower(rows.english_meaning)
);

with topics(topic, exam_type, cefr_level, setting, issue, action, vocabulary) as (
  values
    ('IMMIGRATION', 'BOTH', 'B1_PLUS', 'un centre d''accueil francophone', 'plusieurs documents manquent au dossier', 'l''agent propose une verification progressive', array['dossier','justificatif','progressive']),
    ('HOUSING', 'BOTH', 'B1_PLUS', 'une visite d''appartement', 'le bail contient une clause peu claire', 'la locataire demande une confirmation ecrite', array['bail','clause','confirmation']),
    ('WORK', 'TEF_CANADA', 'B2', 'une equipe administrative', 'le teletravail change l''organisation', 'la responsable cherche un equilibre durable', array['teletravail','organisation','equilibre']),
    ('HEALTH', 'BOTH', 'B1', 'une clinique de quartier', 'les rendez-vous sont difficiles a obtenir', 'le personnel met en place un rappel par texto', array['clinique','rendez-vous','rappel']),
    ('ADMINISTRATION', 'TCF_CANADA', 'B2', 'un guichet municipal', 'la procedure en ligne exclut certains usagers', 'la ville garde une option en personne', array['procedure','usager','guichet']),
    ('EDUCATION', 'BOTH', 'B1_PLUS', 'un cours du soir', 'les apprenants manquent de temps', 'la formatrice divise les objectifs', array['formation','objectif','formatrice']),
    ('DAILY_LIFE', 'BOTH', 'B1', 'un trajet quotidien', 'les horaires changent souvent', 'les voyageurs comparent plusieurs options', array['trajet','horaire','option']),
    ('OPINION', 'TCF_CANADA', 'B2', 'une reunion citoyenne', 'la nouvelle mesure divise le quartier', 'les participants formulent des reserves', array['mesure','reserve','citoyen']),
    ('TRAVEL', 'BOTH', 'B1_PLUS', 'une gare routiere', 'la correspondance est annoncee tardivement', 'le personnel reformule les consignes', array['correspondance','consigne','gare']),
    ('TECHNOLOGY', 'BOTH', 'B2', 'une plateforme en ligne', 'la mise a jour surprend les utilisateurs', 'le service publie un guide simple', array['plateforme','guide','utilisateur']),
    ('CULTURE', 'BOTH', 'B1_PLUS', 'une bibliotheque locale', 'les ateliers attirent des publics differents', 'l''equipe adapte les horaires', array['atelier','public','horaire']),
    ('ENVIRONMENT', 'BOTH', 'B2', 'un service de collecte', 'les consignes de tri restent mal comprises', 'la municipalite prepare une campagne claire', array['tri','collecte','campagne'])
),
angles(angle, trap_type, difficulty, lead, question_text, option_a, option_b, option_c, option_d, explanation) as (
  values
    (1, 'IMPLICIT_MEANING', 'MEDIUM', 'Dans ce texte, le lecteur doit surtout comprendre la consequence pratique de la situation.', 'Quelle est l''idee principale du passage ?', 'Une solution progressive est proposee', 'Le service ferme definitivement', 'La personne abandonne sa demarche', 'Le probleme est ignore', 'Le texte presente un probleme concret puis une reponse organisee.'),
    (2, 'CONTRAST_MARKER', 'MEDIUM', 'Le passage oppose une difficulte reelle a une solution possible.', 'Quel contraste structure le passage ?', 'Une difficulte existe mais une solution est envisagee', 'Tout fonctionne sans limite', 'La solution aggrave volontairement le probleme', 'Le texte ne presente aucune opposition', 'Les marqueurs de nuance opposent la contrainte et la reponse proposee.'),
    (3, 'SYNONYM_TRAP', 'EASY', 'Certains mots reformulent la meme idee avec un vocabulaire different.', 'Quelle reformulation correspond le mieux au texte ?', 'Le service cherche a rendre la demarche plus claire', 'Le service veut supprimer toute aide', 'Le service refuse les demandes ecrites', 'Le service change de sujet', 'La bonne reponse reprend le sens global sans copier les mots exacts.'),
    (4, 'FALSE_FRIEND', 'HARD', 'Le texte contient un mot transparent qui peut tromper si on lit trop vite.', 'Quelle interpretation faut-il eviter ?', 'Croire qu''un mot transparent garde toujours le meme sens', 'Relier la situation au contexte', 'Verifier la conclusion pratique', 'Identifier le public concerne', 'Le piege consiste a traduire automatiquement au lieu de lire le contexte.'),
    (5, 'IMPLICIT_MEANING', 'HARD', 'La conclusion n''est pas formulee comme un ordre direct.', 'Que peut-on deduire de la fin du passage ?', 'Une action prudente est preferable', 'Aucune decision n''est possible', 'Le sujet ne concerne personne', 'La demarche est terminee sans suite', 'La deduction vient de la relation entre le probleme et la solution.'),
    (6, 'CONTRAST_MARKER', 'MEDIUM', 'Un connecteur introduit une reserve.', 'Pourquoi le texte reste-t-il nuance ?', 'Il reconnait un avantage tout en signalant une limite', 'Il exprime uniquement une colere forte', 'Il donne seulement une liste de prix', 'Il raconte un souvenir personnel sans avis', 'La nuance vient de la concession suivie d''une reserve.'),
    (7, null, 'EASY', 'Le passage donne un detail administratif utile.', 'Quelle information est explicitement donnee ?', 'Une personne ou un service propose une aide', 'Le lieu est ferme pour toujours', 'Le document est deja refuse', 'La date de l''examen est annulee', 'Cette information apparait directement dans le texte.'),
    (8, 'IMPLICIT_MEANING', 'MEDIUM', 'Le lecteur doit identifier le public vise.', 'A qui ce passage s''adresse-t-il surtout ?', 'A des usagers qui doivent prendre une decision pratique', 'A des touristes sans objectif precis', 'A des enfants en vacances', 'A des lecteurs qui cherchent une recette', 'Le vocabulaire et la situation visent des usagers en demarche.'),
    (9, 'CONTRAST_MARKER', 'HARD', 'La phrase finale limite l''enthousiasme initial.', 'Quelle phrase resume le mieux le ton ?', 'Favorable mais prudent', 'Totalement negatif', 'Indifferent', 'Humoristique', 'Le texte accepte une solution mais garde une reserve.'),
    (10, 'SYNONYM_TRAP', 'MEDIUM', 'La question teste une equivalence de sens.', 'Quel mot pourrait remplacer "progressif" dans ce contexte ?', 'Etape par etape', 'Immediat et brutal', 'Inutile', 'Secret', 'Dans ce contexte, progressif signifie organise par etapes.')
),
reading_rows as (
  select row_number() over (order by topics.topic, angles.angle) as n, topics.*, angles.*
  from topics
  cross join angles
),
inserted_passages as (
  insert into public.passages (
    id, title, content, transcript, audio_url, type, skill, exam_type, cefr_level,
    topic, word_count, estimated_minutes, highlighted_vocabulary, is_published
  )
  select
    ('89200000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    'Lecture ' || n || ' - ' || initcap(lower(topic)),
    setting || '. ' || issue || '. Pourtant, la situation n''est pas bloquee: ' || action || '. ' ||
    lead || ' Les candidats de niveau B1/B2 doivent donc distinguer les faits explicites, les reserves et les consequences implicites avant de choisir une reponse.',
    null,
    null,
    'reading',
    'READING',
    exam_type,
    cefr_level,
    topic,
    78,
    5,
    vocabulary,
    true
  from reading_rows
  on conflict (id) do update
  set content = excluded.content,
      type = excluded.type,
      skill = excluded.skill,
      is_published = excluded.is_published
  returning id
)
insert into public.questions (
  id, passage_id, exam_type, skill, skill_type, cefr_level, topic, trap_type,
  difficulty, question_text, option_a, option_b, option_c, option_d,
  correct_option, options, correct_answer_index, explanation, tags, is_published
)
select
  ('89300000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('89200000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  exam_type,
  'READING',
  'READING',
  cefr_level,
  topic,
  trap_type,
  difficulty,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  'A',
  jsonb_build_array(option_a, option_b, option_c, option_d),
  0,
  explanation,
  array['reading', lower(topic), lower(coalesce(trap_type, 'detail'))],
  true
from reading_rows
on conflict (id) do update
set question_text = excluded.question_text,
    options = excluded.options,
    correct_answer_index = excluded.correct_answer_index,
    explanation = excluded.explanation,
    is_published = excluded.is_published;

with topics(topic, exam_type, cefr_level, situation, action) as (
  values
    ('IMMIGRATION', 'BOTH', 'B1_PLUS', 'un agent appelle au sujet du dossier', 'la personne doit attendre le courriel final'),
    ('HOUSING', 'BOTH', 'B1_PLUS', 'une proprietaire laisse un message vocal', 'le locataire doit confirmer la visite'),
    ('WORK', 'TEF_CANADA', 'B2', 'une responsable corrige l''horaire d''entretien', 'le candidat doit retenir la nouvelle heure'),
    ('HEALTH', 'BOTH', 'B1', 'une clinique rappelle une consigne', 'le patient doit suivre la condition precise'),
    ('ADMINISTRATION', 'TCF_CANADA', 'B2', 'un guichet explique une procedure', 'l''usager doit apporter une piece manquante'),
    ('EDUCATION', 'BOTH', 'B1_PLUS', 'une formatrice annonce un changement', 'les participants doivent noter la nouvelle salle'),
    ('DAILY_LIFE', 'BOTH', 'B1', 'un message de transport est diffuse', 'les voyageurs doivent changer de quai'),
    ('OPINION', 'TCF_CANADA', 'B2', 'un habitant donne son avis', 'il soutient la mesure avec une reserve'),
    ('TRAVEL', 'BOTH', 'B1_PLUS', 'une annonce de gare corrige une information', 'les passagers doivent verifier la correspondance'),
    ('TECHNOLOGY', 'BOTH', 'B2', 'un service en ligne avertit les usagers', 'ils doivent mettre a jour leur mot de passe'),
    ('CULTURE', 'BOTH', 'B1_PLUS', 'une bibliotheque confirme un atelier', 'les inscrits doivent arriver plus tot'),
    ('ENVIRONMENT', 'BOTH', 'B2', 'la municipalite precise une collecte', 'les residents doivent sortir le bac le bon jour')
),
traps(trap_type, difficulty, transcript_tail, question_text, option_a, option_b, option_c, option_d, explanation) as (
  values
    ('NEGATION', 'MEDIUM', 'Ce n''est pas annule; c''est simplement reporte a lundi prochain.', 'Que faut-il comprendre ?', 'L''action est reportee', 'L''action est annulee', 'L''action commence maintenant', 'Aucune suite n''est prevue', 'La negation corrige l''idee d''annulation.'),
    ('NUMBER_DATE', 'MEDIUM', 'Je me corrige: ce n''est pas a 14 h 30, mais a 15 h 30.', 'Quelle heure faut-il retenir ?', '15 h 30', '14 h 30', '13 h 30', '16 h 15', 'Le dernier horaire corrige le premier.'),
    ('CONTRAST_MARKER', 'HARD', 'Certes, cette solution aide beaucoup, mais elle demande une bonne organisation.', 'Quel est le ton du locuteur ?', 'Favorable mais prudent', 'Totalement oppose', 'Indifferent', 'Amuse', 'Certes...mais introduit une opinion nuancee.'),
    ('DOUBLE_NEGATIVE', 'HARD', 'Le document n''est ni signe ni accompagne de la preuve demandee.', 'Quel probleme est signale ?', 'Deux elements manquent', 'Tout est complet', 'La preuve suffit', 'La signature suffit', 'Ni...ni indique deux absences.'),
    ('IMPLICIT_MEANING', 'HARD', 'Je vais reprendre lentement afin que vous puissiez noter chaque etape.', 'Pourquoi la personne parle-t-elle lentement ?', 'Pour faciliter la prise de notes', 'Parce qu''elle hesite', 'Parce qu''elle lit une publicite', 'Parce qu''elle refuse d''aider', 'L''intention est implicite dans afin que.'),
    ('FALSE_FRIEND', 'MEDIUM', 'Actuellement, le service est ouvert seulement le matin.', 'Que signifie actuellement ici ?', 'En ce moment', 'Finalement', 'Eventuellement', 'Anciennement', 'Actuellement signifie en ce moment.'),
    ('NUMBER_DATE', 'MEDIUM', 'Il faut attendre environ dix semaines, pas deux semaines.', 'Quel delai faut-il retenir ?', 'Environ dix semaines', 'Deux semaines', 'Douze jours', 'Dix jours', 'La correction finale donne le delai exact a retenir.'),
    ('CONTRAST_MARKER', 'MEDIUM', 'Le prix est raisonnable; en revanche, le trajet reste long.', 'Quel inconvenient est mentionne ?', 'Le trajet est long', 'Le prix est trop eleve', 'Le dossier est incomplet', 'Le service est ferme', 'En revanche introduit la limite.'),
    ('NEGATION', 'MEDIUM', 'Si la situation ne s''ameliore pas, rappelez demain matin.', 'Quelle action est demandee sous condition ?', 'Rappeler demain matin', 'Ne jamais rappeler', 'Venir sans rendez-vous', 'Annuler le dossier', 'La condition negative declenche l''action.')
),
listening_rows as (
  select row_number() over (order by topics.topic, traps.trap_type, traps.transcript_tail) as n, topics.*, traps.*
  from topics
  cross join traps
),
inserted_listening_passages as (
  insert into public.passages (
    id, title, content, transcript, audio_url, type, skill, exam_type, cefr_level,
    topic, word_count, estimated_minutes, highlighted_vocabulary, is_published
  )
  select
    ('89400000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    'Audio ' || n || ' - ' || initcap(lower(topic)),
    situation || ': ' || action || '.',
    situation || '. ' || action || '. ' || transcript_tail,
    null,
    'listening',
    'LISTENING',
    exam_type,
    cefr_level,
    topic,
    36,
    2,
    array[lower(topic), lower(trap_type)],
    true
  from listening_rows
  on conflict (id) do update
  set transcript = excluded.transcript,
      type = excluded.type,
      skill = excluded.skill,
      is_published = excluded.is_published
  returning id
)
insert into public.questions (
  id, passage_id, exam_type, skill, skill_type, cefr_level, topic, trap_type,
  difficulty, question_text, option_a, option_b, option_c, option_d,
  correct_option, options, correct_answer_index, explanation, tags, is_published
)
select
  ('89500000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('89400000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  exam_type,
  'LISTENING',
  'LISTENING',
  cefr_level,
  topic,
  trap_type,
  difficulty,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  'A',
  jsonb_build_array(option_a, option_b, option_c, option_d),
  0,
  explanation,
  array['listening', lower(topic), lower(trap_type), 'tts-ready'],
  true
from listening_rows
on conflict (id) do update
set question_text = excluded.question_text,
    options = excluded.options,
    passage_id = excluded.passage_id,
    explanation = excluded.explanation,
    is_published = excluded.is_published;

with topics(topic, exam_type, cefr_level) as (
  values
    ('IMMIGRATION', 'BOTH', 'B1_PLUS'),
    ('HOUSING', 'BOTH', 'B1_PLUS'),
    ('WORK', 'TEF_CANADA', 'B2'),
    ('HEALTH', 'BOTH', 'B1_PLUS'),
    ('ADMINISTRATION', 'TCF_CANADA', 'B2'),
    ('EDUCATION', 'BOTH', 'B1_PLUS'),
    ('DAILY_LIFE', 'BOTH', 'B1'),
    ('OPINION', 'TCF_CANADA', 'B2'),
    ('TRAVEL', 'BOTH', 'B1_PLUS'),
    ('TECHNOLOGY', 'BOTH', 'B2')
),
writing_tasks(task_type, title_stub, prompt_stub, min_words, max_words) as (
  values
    ('FORMAL_LETTER', 'Formal request', 'Write a formal message asking for clarification and proposing one practical solution.', 120, 180),
    ('OPINION', 'Opinion response', 'Present a balanced opinion with one advantage, one limit, and a clear conclusion.', 150, 220),
    ('EMAIL', 'Practical email', 'Write an email that explains the problem, gives context, and asks for the next step.', 100, 160)
),
writing_rows as (
  select row_number() over (order by topic, task_type) as n, *
  from topics cross join writing_tasks
)
insert into public.writing_prompts (
  id, title, prompt, prompt_text, type, task_type, cefr_level, exam_type,
  topic, word_limit_min, word_limit_max, target_word_min, target_word_max,
  criteria, is_published
)
select
  ('89600000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  title_stub || ' - ' || initcap(lower(topic)),
  prompt_stub || ' Topic: ' || lower(topic) || '.',
  prompt_stub || ' Topic: ' || lower(topic) || '.',
  task_type,
  task_type,
  cefr_level,
  exam_type,
  topic,
  min_words,
  max_words,
  min_words,
  max_words,
  jsonb_build_array('structure', 'clarity', 'B2 connectors', 'task completion'),
  true
from writing_rows
on conflict (id) do update
set prompt = excluded.prompt,
    prompt_text = excluded.prompt_text,
    is_published = excluded.is_published;

with topics(topic, exam_type, cefr_level) as (
  values
    ('IMMIGRATION', 'BOTH', 'B1_PLUS'),
    ('HOUSING', 'BOTH', 'B1_PLUS'),
    ('WORK', 'TEF_CANADA', 'B2'),
    ('HEALTH', 'BOTH', 'B1_PLUS'),
    ('ADMINISTRATION', 'TCF_CANADA', 'B2'),
    ('EDUCATION', 'BOTH', 'B1_PLUS'),
    ('DAILY_LIFE', 'BOTH', 'B1'),
    ('OPINION', 'TCF_CANADA', 'B2'),
    ('TRAVEL', 'BOTH', 'B1_PLUS'),
    ('TECHNOLOGY', 'BOTH', 'B2')
),
speaking_tasks(task_type, title_stub, prompt_stub, prep, duration) as (
  values
    ('MONOLOGUE', 'Structured monologue', 'Explain the situation, describe one difficulty, and propose a realistic solution.', 45, 120),
    ('OPINION', 'Nuanced opinion', 'Give your opinion with one example and one reservation.', 30, 90),
    ('DIALOGUE', 'Role-play answer', 'Respond politely, ask one clarification question, and confirm the next step.', 30, 90)
),
speaking_rows as (
  select row_number() over (order by topic, task_type) as n, *
  from topics cross join speaking_tasks
)
insert into public.speaking_prompts (
  id, title, prompt, prompt_text, type, task_type, cefr_level, exam_type,
  topic, preparation_seconds, speaking_seconds, duration_seconds, criteria, is_published
)
select
  ('89700000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  title_stub || ' - ' || initcap(lower(topic)),
  prompt_stub || ' Topic: ' || lower(topic) || '.',
  prompt_stub || ' Topic: ' || lower(topic) || '.',
  task_type,
  task_type,
  cefr_level,
  exam_type,
  topic,
  prep,
  duration,
  duration,
  jsonb_build_array('pronunciation', 'fluency', 'structure', 'B2 connectors'),
  true
from speaking_rows
on conflict (id) do update
set prompt = excluded.prompt,
    prompt_text = excluded.prompt_text,
    is_published = excluded.is_published;

notify pgrst, 'reload schema';
