create extension if not exists pgcrypto;

alter table if exists public.vocabulary
  alter column exam_type set default 'BOTH',
  alter column frequency_score set default 0,
  alter column is_published set default false;

alter table if exists public.user_word_bank
  alter column status set default 'new',
  alter column ease_score set default 2.5,
  alter column review_count set default 0,
  alter column mistake_count set default 0,
  alter column correct_count set default 0,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table if exists public.flashcard_sessions
  alter column cards_reviewed set default 0,
  alter column mastered_count set default 0,
  alter column weak_count set default 0,
  alter column xp_earned set default 0,
  alter column started_at set default now();

alter table if exists public.flashcard_reviews
  alter column xp_earned set default 0,
  alter column reviewed_at set default now();

alter table if exists public.ai_usage_logs
  alter column user_id drop not null,
  add column if not exists model text,
  add column if not exists provider text not null default 'nvidia',
  add column if not exists tokens_input integer,
  add column if not exists tokens_output integer,
  add column if not exists cost_estimate numeric(10,4),
  add column if not exists success boolean not null default true,
  add column if not exists error_message text;

alter table if exists public.ai_usage_logs
  add column if not exists metadata jsonb;

create index if not exists ai_usage_logs_user_feature_created
  on public.ai_usage_logs (user_id, feature, created_at desc);

alter table public.profiles
  drop constraint if exists profiles_role_check,
  add constraint profiles_role_check
    check (role in ('USER', 'ADMIN'));

alter table public.passages
  drop constraint if exists passages_exam_type_check,
  add constraint passages_exam_type_check
    check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  drop constraint if exists passages_cefr_level_check,
  add constraint passages_cefr_level_check
    check (cefr_level in ('A1', 'A2', 'B1_MINUS', 'B1', 'B1_PLUS', 'B2_MINUS', 'B2', 'B2_PLUS', 'C1'));

alter table public.questions
  drop constraint if exists questions_skill_type_check,
  add constraint questions_skill_type_check
    check (skill_type in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY')),
  drop constraint if exists questions_exam_type_check,
  add constraint questions_exam_type_check
    check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  drop constraint if exists questions_cefr_level_check,
  add constraint questions_cefr_level_check
    check (cefr_level in ('A1', 'A2', 'B1_MINUS', 'B1', 'B1_PLUS', 'B2_MINUS', 'B2', 'B2_PLUS', 'C1')),
  drop constraint if exists questions_difficulty_check,
  add constraint questions_difficulty_check
    check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  drop constraint if exists questions_trap_type_check,
  add constraint questions_trap_type_check
    check (
      trap_type is null or trap_type in (
        'NEGATION',
        'NUMBER_DATE',
        'CONTRAST_MARKER',
        'SYNONYM_TRAP',
        'FALSE_FRIEND',
        'DOUBLE_NEGATIVE',
        'IMPLICIT_MEANING'
      )
    );

alter table public.vocabulary
  drop constraint if exists vocabulary_exam_type_check,
  add constraint vocabulary_exam_type_check
    check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  drop constraint if exists vocabulary_cefr_level_check,
  add constraint vocabulary_cefr_level_check
    check (cefr_level in ('A1', 'A2', 'B1_MINUS', 'B1', 'B1_PLUS', 'B2_MINUS', 'B2', 'B2_PLUS', 'C1'));

alter table public.user_word_bank
  drop constraint if exists user_word_bank_status_check,
  add constraint user_word_bank_status_check
    check (status in ('new', 'learning', 'weak', 'mastered'));

alter table public.writing_prompts
  drop constraint if exists writing_prompts_exam_type_check,
  add constraint writing_prompts_exam_type_check
    check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  drop constraint if exists writing_prompts_cefr_level_check,
  add constraint writing_prompts_cefr_level_check
    check (cefr_level in ('A1', 'A2', 'B1_MINUS', 'B1', 'B1_PLUS', 'B2_MINUS', 'B2', 'B2_PLUS', 'C1'));

alter table public.speaking_prompts
  drop constraint if exists speaking_prompts_exam_type_check,
  add constraint speaking_prompts_exam_type_check
    check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  drop constraint if exists speaking_prompts_cefr_level_check,
  add constraint speaking_prompts_cefr_level_check
    check (cefr_level in ('A1', 'A2', 'B1_MINUS', 'B1', 'B1_PLUS', 'B2_MINUS', 'B2', 'B2_PLUS', 'C1'));

alter table public.mock_tests
  drop constraint if exists mock_tests_exam_type_check,
  add constraint mock_tests_exam_type_check
    check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED'));

alter table public.mock_test_sections
  drop constraint if exists mock_test_sections_skill_type_check,
  add constraint mock_test_sections_skill_type_check
    check (skill_type in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY'));

alter table public.daily_tasks
  drop constraint if exists daily_tasks_skill_type_check,
  add constraint daily_tasks_skill_type_check
    check (skill_type in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY'));

alter table public.weakness_quests
  drop constraint if exists weakness_quests_skill_type_check,
  add constraint weakness_quests_skill_type_check
    check (skill_type in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY')),
  drop constraint if exists weakness_quests_trap_type_check,
  add constraint weakness_quests_trap_type_check
    check (
      trap_type is null or trap_type in (
        'NEGATION',
        'NUMBER_DATE',
        'CONTRAST_MARKER',
        'SYNONYM_TRAP',
        'FALSE_FRIEND',
        'DOUBLE_NEGATIVE',
        'IMPLICIT_MEANING'
      )
    ),
  drop constraint if exists weakness_quests_difficulty_check,
  add constraint weakness_quests_difficulty_check
    check (difficulty in ('EASY', 'MEDIUM', 'HARD'));

alter table public.flashcard_reviews
  drop constraint if exists flashcard_reviews_rating_check,
  add constraint flashcard_reviews_rating_check
    check (rating in ('again', 'hard', 'good', 'easy')),
  drop constraint if exists flashcard_reviews_previous_status_check,
  add constraint flashcard_reviews_previous_status_check
    check (previous_status is null or previous_status in ('new', 'learning', 'weak', 'mastered')),
  drop constraint if exists flashcard_reviews_new_status_check,
  add constraint flashcard_reviews_new_status_check
    check (new_status is null or new_status in ('new', 'learning', 'weak', 'mastered'));

insert into storage.buckets (id, name, public)
values
  ('listening-audio', 'listening-audio', true),
  ('speaking-audio', 'speaking-audio', false),
  ('user-uploads', 'user-uploads', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_usage_logs' and policyname = 'ai_usage_logs_select_own'
  ) then
    create policy ai_usage_logs_select_own
    on public.ai_usage_logs
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_usage_logs' and policyname = 'ai_usage_logs_insert_own'
  ) then
    create policy ai_usage_logs_insert_own
    on public.ai_usage_logs
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_usage_logs' and policyname = 'ai_usage_logs_admin_read'
  ) then
    create policy ai_usage_logs_admin_read
    on public.ai_usage_logs
    for select
    to authenticated
    using (public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'listening_audio_public_read'
  ) then
    create policy listening_audio_public_read
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'listening-audio');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'speaking_audio_own_read'
  ) then
    create policy speaking_audio_own_read
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'speaking-audio'
      and (
        auth.uid()::text = (storage.foldername(name))[1]
        or public.is_admin()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'speaking_audio_own_upload'
  ) then
    create policy speaking_audio_own_upload
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'speaking-audio'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'user_uploads_own_read'
  ) then
    create policy user_uploads_own_read
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'user-uploads'
      and (
        auth.uid()::text = (storage.foldername(name))[1]
        or public.is_admin()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'user_uploads_own_upload'
  ) then
    create policy user_uploads_own_upload
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'user-uploads'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end $$;
