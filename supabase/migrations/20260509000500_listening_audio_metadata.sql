alter table public.passages add column if not exists audio_voice text;
alter table public.passages add column if not exists audio_duration_seconds integer;
alter table public.passages add column if not exists audio_source text;
alter table public.passages add column if not exists accent text;
alter table public.passages add column if not exists speed text;

create index if not exists passages_listening_audio_idx
  on public.passages(type, is_published, audio_url);

notify pgrst, 'reload schema';
