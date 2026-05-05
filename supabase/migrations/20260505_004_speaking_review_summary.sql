alter table public.speaking_submissions
  add column if not exists estimated_cefr text,
  add column if not exists score_20 integer;
