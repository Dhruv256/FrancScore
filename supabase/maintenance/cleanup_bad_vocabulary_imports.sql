-- Safe cleanup for schedule/headings/concepts accidentally imported as flashcards.
-- This does not delete data. It unpublishes noisy rows and tags them for review.

update public.vocabulary
set
  is_published = false,
  tags = array(
    select distinct tag
    from unnest(coalesce(tags, '{}') || array['bad-import', 'needs-review']) as tag
  ),
  updated_at = now()
where
  french_word ~* '^\s*(day\s*[0-9]+|part\s*[0-9]+|concepts?|mini|vocabulary|french study schedule|collocations\s*\+\s*mini|70\s+high)\s*$'
  or french_word ~* '^\s*[0-9]+\s*[-–—]\s*[0-9]+\s*$'
  or french_word ~* '^\s*(1\s*[-–—]\s*40|41\s*[-–—]\s*70|71\s*[-–—]\s*100)\s*$'
  or lower(coalesce(french_example, '')) like 'dans un contexte d''examen, le mot%'
  or lower(coalesce(french_example, '')) like 'dans un contexte d’examen, le mot%';

-- Keep useful real rows published if they were accidentally caught by broad review workflows.
update public.vocabulary
set is_published = true,
    tags = array_remove(coalesce(tags, '{}'), 'bad-import'),
    updated_at = now()
where lower(french_word) in (
  'aujourd''hui',
  'aujourd’hui',
  'demain',
  'dernier',
  'ensuite',
  'caution',
  'assurance',
  'bientôt disponible',
  'on se voit demain ?',
  'je viens de finir.',
  'j’ai déjà fini.',
  'j''ai déjà fini.'
);

notify pgrst, 'reload schema';
