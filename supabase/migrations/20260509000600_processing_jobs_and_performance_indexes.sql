create extension if not exists pgcrypto;

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  job_type text not null,
  status text not null default 'queued',
  progress integer not null default 0,
  total_steps integer,
  current_step text,
  input_json jsonb not null default '{}',
  result_json jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress_summary (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer not null default 0,
  current_streak integer not null default 0,
  b2_readiness_score integer not null default 0,
  vocabulary_mastery_pct integer not null default 0,
  listening_accuracy integer not null default 0,
  reading_accuracy integer not null default 0,
  writing_avg_score numeric,
  speaking_avg_score numeric,
  weak_trap_types jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create index if not exists vocabulary_is_published_idx on public.vocabulary(is_published);
create index if not exists vocabulary_cefr_level_idx on public.vocabulary(cefr_level);
create index if not exists vocabulary_topic_idx on public.vocabulary(topic);
create index if not exists vocabulary_exam_type_idx on public.vocabulary(exam_type);
create index if not exists vocabulary_frequency_score_idx on public.vocabulary(frequency_score desc);
create index if not exists vocabulary_french_word_idx on public.vocabulary(lower(french_word));

create index if not exists user_word_bank_user_id_idx on public.user_word_bank(user_id);
create index if not exists user_word_bank_user_status_idx on public.user_word_bank(user_id, status);
create index if not exists user_word_bank_user_next_review_idx on public.user_word_bank(user_id, next_review_at);

create index if not exists attempts_user_id_idx on public.attempts(user_id);
create index if not exists attempts_question_id_idx on public.attempts(question_id);
create index if not exists attempts_created_at_idx on public.attempts(created_at desc);
create index if not exists attempts_submitted_at_idx on public.attempts(submitted_at desc);

create index if not exists questions_skill_type_idx on public.questions(skill_type);
create index if not exists questions_exam_type_idx on public.questions(exam_type);
create index if not exists questions_cefr_level_idx on public.questions(cefr_level);
create index if not exists questions_trap_type_idx on public.questions(trap_type);
create index if not exists questions_is_published_idx on public.questions(is_published);
create index if not exists questions_practice_filter_idx on public.questions(skill_type, is_published, exam_type, cefr_level, topic, trap_type);

create index if not exists pdf_import_chunks_batch_status_idx on public.pdf_import_chunks(batch_id, ai_status);

create index if not exists processing_jobs_user_id_idx on public.processing_jobs(user_id);
create index if not exists processing_jobs_status_idx on public.processing_jobs(status);
create index if not exists processing_jobs_job_type_idx on public.processing_jobs(job_type);
create index if not exists processing_jobs_created_at_idx on public.processing_jobs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_processing_jobs_updated_at on public.processing_jobs;
create trigger set_processing_jobs_updated_at
before update on public.processing_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_user_progress_summary_updated_at on public.user_progress_summary;
create trigger set_user_progress_summary_updated_at
before update on public.user_progress_summary
for each row execute function public.set_updated_at();

alter table public.processing_jobs enable row level security;
alter table public.user_progress_summary enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'processing_jobs' and policyname = 'Users can read own processing jobs') then
    create policy "Users can read own processing jobs"
      on public.processing_jobs for select
      to authenticated
      using (user_id = auth.uid() or public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'processing_jobs' and policyname = 'Users can create own processing jobs') then
    create policy "Users can create own processing jobs"
      on public.processing_jobs for insert
      to authenticated
      with check (user_id = auth.uid() or public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'processing_jobs' and policyname = 'Admins can manage processing jobs') then
    create policy "Admins can manage processing jobs"
      on public.processing_jobs for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_progress_summary' and policyname = 'Users can read own progress summary') then
    create policy "Users can read own progress summary"
      on public.user_progress_summary for select
      to authenticated
      using (user_id = auth.uid() or public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_progress_summary' and policyname = 'Admins can manage progress summaries') then
    create policy "Admins can manage progress summaries"
      on public.user_progress_summary for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

notify pgrst, 'reload schema';
