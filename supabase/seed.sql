insert into public.vocabulary (
  id,
  french_word,
  english_meaning,
  french_example,
  english_example_translation,
  cefr_level,
  topic,
  exam_type,
  frequency_score,
  tags,
  is_published
)
values
  ('10000000-0000-4000-8000-000000000001', 'pourtant', 'however / yet', 'Il voulait partir tot, pourtant il est arrive en retard.', 'He wanted to leave early, yet he arrived late.', 'B1', 'OPINION', 'BOTH', 95, array['connector', 'contrast', 'trap-word'], true),
  ('10000000-0000-4000-8000-000000000002', 'neanmoins', 'nevertheless', 'Le projet est couteux, neanmoins il est necessaire.', 'The project is costly, nevertheless it is necessary.', 'B2', 'WORK', 'TEF_CANADA', 88, array['connector', 'formal'], true),
  ('10000000-0000-4000-8000-000000000003', 'cependant', 'however', 'Il fait beau. Cependant, il fait tres froid.', 'The weather is nice. However, it is very cold.', 'B1_PLUS', 'DAILY_LIFE', 'BOTH', 93, array['connector', 'contrast'], true),
  ('10000000-0000-4000-8000-000000000004', 'en revanche', 'on the other hand', 'Le prix est eleve. En revanche, la qualite est excellente.', 'The price is high. On the other hand, the quality is excellent.', 'B2', 'OPINION', 'BOTH', 85, array['connector', 'contrast'], true),
  ('10000000-0000-4000-8000-000000000005', 'dailleurs', 'besides / moreover', 'Dailleurs, cette solution serait moins couteuse.', 'Besides, this solution would be less expensive.', 'B1_PLUS', 'WORK', 'BOTH', 82, array['connector', 'opinion'], true),
  ('10000000-0000-4000-8000-000000000006', 'malgre', 'despite', 'Malgre la pluie, nous sommes alles au parc.', 'Despite the rain, we went to the park.', 'B1', 'DAILY_LIFE', 'BOTH', 94, array['connector', 'contrast'], true),
  ('10000000-0000-4000-8000-000000000007', 'or', 'now / however', 'Or, les resultats montrent une tendance inverse.', 'However, the results show the opposite trend.', 'B2', 'OPINION', 'TCF_CANADA', 76, array['connector', 'formal'], true),
  ('10000000-0000-4000-8000-000000000008', 'ainsi', 'thus / therefore', 'Ainsi, il vaut mieux preparer un plan clair.', 'Thus, it is better to prepare a clear plan.', 'B1_PLUS', 'EDUCATION', 'BOTH', 80, array['connector', 'logic'], true),
  ('10000000-0000-4000-8000-000000000009', 'en effet', 'indeed', 'En effet, cette mesure pourrait aider de nombreuses familles.', 'Indeed, this measure could help many families.', 'B1_PLUS', 'OPINION', 'BOTH', 81, array['connector', 'logic'], true),
  ('10000000-0000-4000-8000-000000000010', 'toutefois', 'however / nevertheless', 'Toutefois, il faut considerer les couts supplementaires.', 'However, the additional costs must be considered.', 'B2', 'WORK', 'BOTH', 87, array['connector', 'contrast'], true),
  ('10000000-0000-4000-8000-000000000011', 'actuellement', 'currently', 'Actuellement, je travaille dans une entreprise de technologie.', 'Currently, I work in a technology company.', 'B1', 'WORK', 'BOTH', 92, array['false-friend', 'trap-word'], true),
  ('10000000-0000-4000-8000-000000000012', 'eventuellement', 'possibly', 'Nous pourrions eventuellement reporter la reunion.', 'We could possibly postpone the meeting.', 'B2', 'WORK', 'BOTH', 79, array['false-friend', 'trap-word'], true),
  ('10000000-0000-4000-8000-000000000013', 'sensible', 'sensitive', 'Ce sujet est sensible pour de nombreux candidats.', 'This subject is sensitive for many candidates.', 'B1_PLUS', 'OPINION', 'BOTH', 77, array['false-friend', 'trap-word'], true),
  ('10000000-0000-4000-8000-000000000014', 'assister a', 'to attend', 'Je vais assister a la conference demain.', 'I am going to attend the conference tomorrow.', 'B1', 'WORK', 'BOTH', 74, array['false-friend', 'trap-word'], true),
  ('10000000-0000-4000-8000-000000000015', 'demarche', 'process / procedure', 'Il faut suivre la bonne demarche pour obtenir un visa.', 'You need to follow the right process to get a visa.', 'B2', 'ADMINISTRATION', 'BOTH', 90, array['immigration', 'formal'], true),
  ('10000000-0000-4000-8000-000000000016', 'aupres de', 'with / from an authority', 'Vous pouvez faire une demande aupres de la prefecture.', 'You can submit a request to the prefecture.', 'B2', 'ADMINISTRATION', 'TCF_CANADA', 78, array['formal', 'preposition'], true),
  ('10000000-0000-4000-8000-000000000017', 'beneficier', 'to benefit', 'Les residents peuvent beneficier dune aide financiere.', 'Residents can benefit from financial assistance.', 'B2', 'IMMIGRATION', 'BOTH', 86, array['formal', 'verb'], true),
  ('10000000-0000-4000-8000-000000000018', 'davantage', 'more / further', 'Nous devons travailler davantage pour reussir lexamen.', 'We need to work more to pass the exam.', 'B1_PLUS', 'EDUCATION', 'BOTH', 82, array['quantity', 'formal'], true),
  ('10000000-0000-4000-8000-000000000019', 'pas du tout', 'not at all', 'Je ne suis pas du tout daccord avec cette proposition.', 'I do not agree with this proposal at all.', 'B1', 'OPINION', 'BOTH', 70, array['listening-trap', 'negation'], true),
  ('10000000-0000-4000-8000-000000000020', 'ni lun ni lautre', 'neither one nor the other', 'Ni lun ni lautre ne convient a notre budget.', 'Neither one nor the other suits our budget.', 'B2', 'HOUSING', 'BOTH', 68, array['listening-trap', 'double-negative'], true)
on conflict (id) do update set
  french_word = excluded.french_word,
  english_meaning = excluded.english_meaning,
  french_example = excluded.french_example,
  english_example_translation = excluded.english_example_translation,
  cefr_level = excluded.cefr_level,
  topic = excluded.topic,
  exam_type = excluded.exam_type,
  frequency_score = excluded.frequency_score,
  tags = excluded.tags,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.passages (
  id,
  title,
  content,
  cefr_level,
  exam_type,
  topic,
  word_count,
  estimated_minutes,
  highlighted_vocabulary,
  is_published
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Immigration francophone au Canada',
    'Le Canada accueille chaque annee de nombreux immigrants francophones. Pourtant, leur integration peut etre complexe. Ils doivent comprendre les demarches administratives, trouver un logement et reconnaitre leurs diplomes. Neanmoins, les communautes francophones locales offrent souvent un accompagnement utile et des informations pratiques.',
    'B2',
    'BOTH',
    'IMMIGRATION',
    48,
    4,
    array['pourtant', 'neanmoins', 'demarche'],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Le teletravail au quotidien',
    'De plus en plus de salaries travaillent a distance. En revanche, cette flexibilite exige une bonne organisation. Certains employes apprecient le gain de temps, tandis que dautres regrettent le manque de contact humain. Ainsi, les entreprises doivent trouver un equilibre entre autonomie et collaboration.',
    'B1_PLUS',
    'TEF_CANADA',
    'WORK',
    45,
    4,
    array['en revanche', 'ainsi', 'cependant'],
    true
  )
on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  cefr_level = excluded.cefr_level,
  exam_type = excluded.exam_type,
  topic = excluded.topic,
  word_count = excluded.word_count,
  estimated_minutes = excluded.estimated_minutes,
  highlighted_vocabulary = excluded.highlighted_vocabulary,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.questions (
  id,
  skill_type,
  question_text,
  options,
  correct_answer_index,
  explanation,
  trap_type,
  topic,
  cefr_level,
  exam_type,
  difficulty,
  tags,
  passage_id,
  audio_url,
  transcript,
  is_published
)
values
  ('30000000-0000-4000-8000-000000000001', 'READING', 'Quel obstacle est mentionne dans le premier passage ?', '["Les demarches administratives","Le climat tropical","Le manque de transports","La fermeture des ecoles"]'::jsonb, 0, 'Le passage cite explicitement les demarches administratives.', 'IMPLICIT_MEANING', 'IMMIGRATION', 'B1_PLUS', 'BOTH', 'MEDIUM', array['reading', 'immigration'], '20000000-0000-4000-8000-000000000001', null, null, true),
  ('30000000-0000-4000-8000-000000000002', 'READING', 'Quel mot introduit une opposition dans le passage sur le teletravail ?', '["Ainsi","En revanche","De plus","Dailleurs"]'::jsonb, 1, 'En revanche signale un contraste entre avantage et contrainte.', 'CONTRAST_MARKER', 'WORK', 'B1_PLUS', 'TEF_CANADA', 'MEDIUM', array['reading', 'connector'], '20000000-0000-4000-8000-000000000002', null, null, true),
  ('30000000-0000-4000-8000-000000000003', 'READING', 'Pourquoi les communautes francophones sont-elles utiles ?', '["Elles offrent un accompagnement","Elles remplacent les universites","Elles financent tous les projets","Elles gerent les visas"]'::jsonb, 0, 'Le passage indique quelles offrent un accompagnement utile.', null, 'IMMIGRATION', 'B1', 'BOTH', 'EASY', array['reading', 'support'], '20000000-0000-4000-8000-000000000001', null, null, true),
  ('30000000-0000-4000-8000-000000000004', 'READING', 'Quel est le ton du passage sur le teletravail ?', '["Totalement negatif","Nuance","Sans opinion","Humoristique"]'::jsonb, 1, 'Le texte presente des avantages et des limites, donc une position nuancee.', 'CONTRAST_MARKER', 'WORK', 'B2', 'TEF_CANADA', 'HARD', array['reading', 'tone'], '20000000-0000-4000-8000-000000000002', null, null, true),
  ('30000000-0000-4000-8000-000000000005', 'READING', 'Que doivent faire les entreprises selon le passage ?', '["Trouver un equilibre","Supprimer le teletravail","Payer moins les salaries","Imposer plus de reunions"]'::jsonb, 0, 'La conclusion dit quelles doivent trouver un equilibre.', null, 'WORK', 'B1_PLUS', 'TEF_CANADA', 'EASY', array['reading', 'comprehension'], '20000000-0000-4000-8000-000000000002', null, null, true),
  ('30000000-0000-4000-8000-000000000006', 'LISTENING', 'La reunion na pas ete annulee. Que sest-il passe ?', '["Elle a ete reportee","Elle a ete annulee","Elle commence plus tot","Elle est en ligne"]'::jsonb, 0, 'La negation indique que la reunion continue, mais a une autre date.', 'NEGATION', 'WORK', 'B1_PLUS', 'TEF_CANADA', 'MEDIUM', array['listening', 'negation'], null, null, 'La reunion na pas ete annulee; elle a ete reportee a lundi prochain.', true),
  ('30000000-0000-4000-8000-000000000007', 'LISTENING', 'A quelle heure le rendez-vous final est-il fixe ?', '["14h15","14h30","15h30","16h00"]'::jsonb, 2, 'Le locuteur se corrige et donne finalement 15h30.', 'NUMBER_DATE', 'DAILY_LIFE', 'B1', 'BOTH', 'MEDIUM', array['listening', 'numbers'], null, null, 'Au debut il parle de 14h30, puis il corrige: finalement, ce sera a 15h30.', true),
  ('30000000-0000-4000-8000-000000000008', 'LISTENING', 'Quelle attitude exprime le locuteur envers le nouveau reglement ?', '["Une approbation totale","Une approbation nuancee","Un rejet complet","Aucune opinion"]'::jsonb, 1, 'Le marqueur de contraste montre quil est globalement favorable, mais prudent.', 'CONTRAST_MARKER', 'OPINION', 'B2', 'TCF_CANADA', 'HARD', array['listening', 'contrast'], null, null, 'Certes, le reglement est utile, mais il faudra quelques ajustements.', true),
  ('30000000-0000-4000-8000-000000000009', 'LISTENING', 'Quel prix faut-il retenir ?', '["29 dollars","39 dollars","49 dollars","59 dollars"]'::jsonb, 1, 'Le premier chiffre est corrige ensuite par le locuteur.', 'NUMBER_DATE', 'HOUSING', 'B1', 'BOTH', 'MEDIUM', array['listening', 'price'], null, null, 'Le studio est a 39 dollars par nuit, pas 29 comme je lai dit au debut.', true),
  ('30000000-0000-4000-8000-000000000010', 'LISTENING', 'Que signifie la structure "certes... mais" ?', '["Un accord total","Une absence dopinion","Un accord nuance","Un refus net"]'::jsonb, 2, 'Cette structure annonce une concession suivie dune reserve.', 'CONTRAST_MARKER', 'OPINION', 'B2', 'BOTH', 'MEDIUM', array['listening', 'connector'], null, null, 'Certes, le quartier est central, mais le loyer reste assez eleve pour un etudiant.', true)
on conflict (id) do update set
  skill_type = excluded.skill_type,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_answer_index = excluded.correct_answer_index,
  explanation = excluded.explanation,
  trap_type = excluded.trap_type,
  topic = excluded.topic,
  cefr_level = excluded.cefr_level,
  exam_type = excluded.exam_type,
  difficulty = excluded.difficulty,
  tags = excluded.tags,
  passage_id = excluded.passage_id,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.writing_prompts (
  id,
  title,
  prompt,
  type,
  cefr_level,
  exam_type,
  topic,
  word_limit_min,
  word_limit_max,
  criteria,
  is_published
)
values
  ('40000000-0000-4000-8000-000000000001', 'Lettre formelle: demande de logement', 'Vous venez darriver au Canada et vous cherchez un logement. Ecrivez au proprietaire pour demander une visite.', 'FORMAL_LETTER', 'B2', 'TEF_CANADA', 'HOUSING', 150, 250, '["registre formel","demande polie","organisation claire"]'::jsonb, true),
  ('40000000-0000-4000-8000-000000000002', 'Essai: le teletravail', 'Pensez-vous que le teletravail devrait devenir la norme? Donnez votre opinion avec des arguments.', 'ESSAY', 'B2', 'TEF_CANADA', 'WORK', 180, 280, '["these claire","connecteurs logiques","conclusion nette"]'::jsonb, true),
  ('40000000-0000-4000-8000-000000000003', 'Courriel: probleme administratif', 'Vous avez recu un document incomplet. Ecrivez un courriel pour expliquer le probleme et demander une solution.', 'EMAIL', 'B1_PLUS', 'TCF_CANADA', 'ADMINISTRATION', 120, 220, '["demande precise","registre adapte","details utiles"]'::jsonb, true),
  ('40000000-0000-4000-8000-000000000004', 'Opinion: education et reussite', 'Leducation est-elle le facteur le plus important pour reussir? Donnez votre opinion.', 'OPINION', 'B2', 'TCF_CANADA', 'EDUCATION', 180, 280, '["opinion argumentee","exemples pertinents","bonne structure"]'::jsonb, true)
on conflict (id) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  type = excluded.type,
  cefr_level = excluded.cefr_level,
  exam_type = excluded.exam_type,
  topic = excluded.topic,
  word_limit_min = excluded.word_limit_min,
  word_limit_max = excluded.word_limit_max,
  criteria = excluded.criteria,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.speaking_prompts (
  id,
  title,
  prompt,
  type,
  cefr_level,
  exam_type,
  topic,
  duration_seconds,
  preparation_seconds,
  criteria,
  is_published
)
values
  ('50000000-0000-4000-8000-000000000001', 'Monologue: votre parcours professionnel', 'Presentez votre parcours professionnel et vos projets pour lavenir au Canada.', 'MONOLOGUE', 'B1_PLUS', 'TEF_CANADA', 'WORK', 120, 30, '["chronologie claire","vocabulaire professionnel","projets futurs"]'::jsonb, true),
  ('50000000-0000-4000-8000-000000000002', 'Opinion: le teletravail', 'Etes-vous pour ou contre le teletravail? Presentez des arguments avant de conclure.', 'OPINION', 'B2', 'TEF_CANADA', 'WORK', 180, 60, '["position claire","arguments opposes","conclusion personnelle"]'::jsonb, true),
  ('50000000-0000-4000-8000-000000000003', 'Description: votre ville', 'Decrivez votre ville ideale pour vivre et travailler.', 'DESCRIPTION', 'B1_PLUS', 'TCF_CANADA', 'DAILY_LIFE', 120, 30, '["description precise","vocabulaire du quotidien","organisation simple"]'::jsonb, true),
  ('50000000-0000-4000-8000-000000000004', 'Debat: transports publics', 'Faut-il investir davantage dans les transports publics? Defendez votre opinion.', 'DEBATE', 'B2', 'TCF_CANADA', 'ENVIRONMENT', 180, 45, '["arguments structures","connecteurs efficaces","prise de position"]'::jsonb, true)
on conflict (id) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  type = excluded.type,
  cefr_level = excluded.cefr_level,
  exam_type = excluded.exam_type,
  topic = excluded.topic,
  duration_seconds = excluded.duration_seconds,
  preparation_seconds = excluded.preparation_seconds,
  criteria = excluded.criteria,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.badges (
  id,
  name,
  description,
  icon,
  category,
  requirement,
  xp_reward,
  is_published
)
values
  ('60000000-0000-4000-8000-000000000001', 'Negation Hunter', 'Get 20 negation-trap questions correct.', 'Target', 'LISTENING', '20 correct negation traps', 200, true),
  ('60000000-0000-4000-8000-000000000002', 'Listening Survivor', 'Complete seven listening sessions.', 'Headphones', 'LISTENING', '7 listening sessions', 300, true),
  ('60000000-0000-4000-8000-000000000003', 'B2 Writer', 'Earn five B2-or-above writing evaluations.', 'PenTool', 'WRITING', '5 writing submissions at B2+', 500, true),
  ('60000000-0000-4000-8000-000000000004', 'Speaking Builder', 'Submit ten speaking responses.', 'Mic', 'SPEAKING', '10 speaking submissions', 300, true),
  ('60000000-0000-4000-8000-000000000005', 'Mock Warrior', 'Complete three full mock tests.', 'Swords', 'MOCK_TEST', '3 full mocks completed', 500, true),
  ('60000000-0000-4000-8000-000000000006', 'Speed Reader', 'Finish five reading passages within target time.', 'BookOpen', 'READING', '5 timed reading passages', 250, true),
  ('60000000-0000-4000-8000-000000000007', 'Trap Killer', 'Answer fifty trap-based MCQs correctly.', 'Skull', 'MASTERY', '50 trap-based MCQs correct', 400, true),
  ('60000000-0000-4000-8000-000000000008', 'Connector Master', 'Master key formal connectors used in TEF and TCF.', 'Link', 'VOCABULARY', 'Master connector deck', 250, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  requirement = excluded.requirement,
  xp_reward = excluded.xp_reward,
  is_published = excluded.is_published,
  updated_at = now();
