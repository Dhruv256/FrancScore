create extension if not exists pgcrypto;

alter table if exists public.daily_tasks
  add column if not exists task_type text,
  add column if not exists exam_type text not null default 'BOTH',
  add column if not exists cefr_level text not null default 'B1',
  add column if not exists target_count integer not null default 1,
  add column if not exists content_ref_type text,
  add column if not exists content_ref_id uuid;

update public.daily_tasks
set
  task_type = coalesce(task_type, lower(skill_type)),
  target_count = greatest(coalesce(target_count, 1), 1),
  exam_type = coalesce(exam_type, 'BOTH'),
  cefr_level = coalesce(cefr_level, 'B1');

alter table if exists public.weakness_quests
  add column if not exists exam_type text not null default 'BOTH',
  add column if not exists cefr_level text not null default 'B1',
  add column if not exists target_count integer not null default 1,
  add column if not exists content_ref_type text,
  add column if not exists content_ref_id uuid;

update public.weakness_quests
set
  target_count = greatest(coalesce(target_count, questions_count, 1), 1),
  exam_type = coalesce(exam_type, 'BOTH'),
  cefr_level = coalesce(cefr_level, 'B1');

alter table if exists public.passages
  add column if not exists transcript text,
  add column if not exists audio_url text,
  add column if not exists type text not null default 'reading',
  add column if not exists skill text;

update public.passages
set
  type = coalesce(type, case when transcript is not null then 'listening' else 'reading' end),
  skill = coalesce(skill, upper(coalesce(type, 'reading')));

create index if not exists questions_skill_filter_idx
  on public.questions (skill_type, is_published, exam_type, cefr_level, topic, trap_type);

create index if not exists questions_passage_id_idx
  on public.questions (passage_id);

create index if not exists passages_learning_filter_idx
  on public.passages (type, is_published, exam_type, cefr_level, topic);

create index if not exists vocabulary_learning_filter_idx
  on public.vocabulary (is_published, exam_type, cefr_level, topic, frequency_score desc);

create index if not exists daily_tasks_learning_filter_idx
  on public.daily_tasks (is_published, exam_type, cefr_level, skill_type, task_type);

insert into storage.buckets (id, name, public)
values ('listening-audio', 'listening-audio', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'listening_audio_public_read'
  ) then
    create policy "listening_audio_public_read"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'listening-audio');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'listening_audio_admin_insert'
  ) then
    create policy "listening_audio_admin_insert"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'listening-audio' and public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'listening_audio_admin_update'
  ) then
    create policy "listening_audio_admin_update"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'listening-audio' and public.is_admin())
    with check (bucket_id = 'listening-audio' and public.is_admin());
  end if;
end $$;

notify pgrst, 'reload schema';
