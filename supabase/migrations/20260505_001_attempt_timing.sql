alter table public.attempts
  add column if not exists time_taken_seconds integer;
