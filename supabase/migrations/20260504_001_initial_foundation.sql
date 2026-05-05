create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  target_exam text check (target_exam in ('TEF_CANADA', 'TCF_CANADA', 'MIXED')),
  target_level text check (target_level in ('B2', 'CLB_7', 'CLB_8')),
  exam_date date,
  current_level_self_assessment text check (current_level_self_assessment in ('A2', 'B1', 'B1_PLUS', 'B2_MINUS')),
  weakest_skill text check (weakest_skill in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY')),
  daily_time_minutes integer check (daily_time_minutes is null or daily_time_minutes > 0),
  onboarding_completed boolean not null default false,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  total_xp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.passages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  cefr_level text not null check (cefr_level in ('A1', 'A2', 'B1_MINUS', 'B1', 'B1_PLUS', 'B2_MINUS', 'B2', 'B2_PLUS', 'C1')),
  exam_type text not null default 'BOTH' check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  topic text,
  word_count integer,
  estimated_minutes integer,
  highlighted_vocabulary text[] default '{}',
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  skill_type text not null check (skill_type in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY')),
  question_text text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer_index integer not null default 0,
  explanation text,
  trap_type text check (trap_type in ('NEGATION', 'NUMBER_DATE', 'CONTRAST_MARKER', 'SYNONYM_TRAP', 'FALSE_FRIEND', 'DOUBLE_NEGATIVE', 'IMPLICIT_MEANING')),
  topic text,
  cefr_level text not null check (cefr_level in ('A1', 'A2', 'B1_MINUS', 'B1', 'B1_PLUS', 'B2_MINUS', 'B2', 'B2_PLUS', 'C1')),
  exam_type text not null default 'BOTH' check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  difficulty text not null default 'MEDIUM' check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  tags text[] default '{}',
  audio_url text,
  transcript text,
  passage_id uuid references public.passages(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  french_word text not null,
  english_meaning text not null,
  french_example text,
  english_example_translation text,
  cefr_level text not null,
  topic text,
  exam_type text default 'BOTH',
  frequency_score integer default 0,
  tags text[] default '{}',
  is_published boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_word_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  status text default 'new',
  ease_score numeric default 2.5,
  review_count integer default 0,
  mistake_count integer default 0,
  correct_count integer default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, vocabulary_id)
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_answer_index integer,
  is_correct boolean,
  response_time_ms integer,
  metadata jsonb default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  type text,
  cefr_level text not null,
  exam_type text not null default 'BOTH' check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  topic text,
  word_limit_min integer,
  word_limit_max integer,
  criteria jsonb default '[]'::jsonb,
  sample_response text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid not null references public.writing_prompts(id) on delete cascade,
  submitted_text text not null,
  word_count integer,
  status text not null default 'submitted',
  review_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.speaking_prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  type text,
  cefr_level text not null,
  exam_type text not null default 'BOTH' check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED', 'BOTH')),
  topic text,
  duration_seconds integer,
  preparation_seconds integer,
  criteria jsonb default '[]'::jsonb,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.speaking_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid not null references public.speaking_prompts(id) on delete cascade,
  audio_path text not null,
  transcript text,
  status text not null default 'submitted',
  review_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  exam_type text not null check (exam_type in ('TEF_CANADA', 'TCF_CANADA', 'MIXED')),
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mock_test_sections (
  id uuid primary key default gen_random_uuid(),
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  skill_type text not null check (skill_type in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY')),
  sort_order integer not null default 0,
  question_count integer not null default 0,
  duration_minutes integer not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mock_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  overall_score numeric(5,2),
  cefr_estimate text,
  skill_breakdown jsonb,
  repair_plan jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon text,
  category text not null,
  requirement text,
  xp_reward integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  progress integer not null default 0,
  earned_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  skill_type text not null check (skill_type in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY')),
  xp_reward integer not null default 0,
  estimated_minutes integer not null default 0,
  icon text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weakness_quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  skill_type text not null check (skill_type in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY')),
  trap_type text check (trap_type in ('NEGATION', 'NUMBER_DATE', 'CONTRAST_MARKER', 'SYNONYM_TRAP', 'FALSE_FRIEND', 'DOUBLE_NEGATIVE', 'IMPLICIT_MEANING')),
  questions_count integer not null default 0,
  xp_reward integer not null default 0,
  difficulty text not null default 'MEDIUM' check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  overall_readiness numeric(5,2),
  cefr_estimate text,
  listening_score numeric(5,2),
  reading_score numeric(5,2),
  writing_score numeric(5,2),
  speaking_score numeric(5,2),
  vocabulary_score numeric(5,2),
  snapshot_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcard_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_type text not null,
  cards_reviewed integer default 0,
  mastered_count integer default 0,
  weak_count integer default 0,
  xp_earned integer default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.flashcard_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  rating text not null,
  previous_status text,
  new_status text,
  xp_earned integer default 0,
  reviewed_at timestamptz default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger passages_set_updated_at
before update on public.passages
for each row execute function public.set_updated_at();

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

create trigger vocabulary_set_updated_at
before update on public.vocabulary
for each row execute function public.set_updated_at();

create trigger user_word_bank_set_updated_at
before update on public.user_word_bank
for each row execute function public.set_updated_at();

create trigger writing_prompts_set_updated_at
before update on public.writing_prompts
for each row execute function public.set_updated_at();

create trigger writing_submissions_set_updated_at
before update on public.writing_submissions
for each row execute function public.set_updated_at();

create trigger speaking_prompts_set_updated_at
before update on public.speaking_prompts
for each row execute function public.set_updated_at();

create trigger speaking_submissions_set_updated_at
before update on public.speaking_submissions
for each row execute function public.set_updated_at();

create trigger mock_tests_set_updated_at
before update on public.mock_tests
for each row execute function public.set_updated_at();

create trigger badges_set_updated_at
before update on public.badges
for each row execute function public.set_updated_at();

create trigger daily_tasks_set_updated_at
before update on public.daily_tasks
for each row execute function public.set_updated_at();

create trigger weakness_quests_set_updated_at
before update on public.weakness_quests
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.passages enable row level security;
alter table public.questions enable row level security;
alter table public.vocabulary enable row level security;
alter table public.user_word_bank enable row level security;
alter table public.attempts enable row level security;
alter table public.writing_prompts enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.speaking_prompts enable row level security;
alter table public.speaking_submissions enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_test_sections enable row level security;
alter table public.mock_test_results enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.weakness_quests enable row level security;
alter table public.user_progress_snapshots enable row level security;
alter table public.flashcard_sessions enable row level security;
alter table public.flashcard_reviews enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id or public.is_admin());

create policy "passages_select_published"
on public.passages
for select
to authenticated
using (is_published or public.is_admin());

create policy "passages_admin_manage"
on public.passages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "questions_select_published"
on public.questions
for select
to authenticated
using (is_published or public.is_admin());

create policy "questions_admin_manage"
on public.questions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "vocabulary_select_published"
on public.vocabulary
for select
to authenticated
using (is_published or public.is_admin());

create policy "vocabulary_admin_manage"
on public.vocabulary
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "user_word_bank_own"
on public.user_word_bank
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "attempts_own"
on public.attempts
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "writing_prompts_select_published"
on public.writing_prompts
for select
to authenticated
using (is_published or public.is_admin());

create policy "writing_prompts_admin_manage"
on public.writing_prompts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "writing_submissions_own"
on public.writing_submissions
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "speaking_prompts_select_published"
on public.speaking_prompts
for select
to authenticated
using (is_published or public.is_admin());

create policy "speaking_prompts_admin_manage"
on public.speaking_prompts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "speaking_submissions_own"
on public.speaking_submissions
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "mock_tests_select_published"
on public.mock_tests
for select
to authenticated
using (is_published or public.is_admin());

create policy "mock_tests_admin_manage"
on public.mock_tests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "mock_test_sections_select_published"
on public.mock_test_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.mock_tests
    where mock_tests.id = mock_test_sections.mock_test_id
      and (mock_tests.is_published or public.is_admin())
  )
);

create policy "mock_test_sections_admin_manage"
on public.mock_test_sections
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "mock_test_results_own"
on public.mock_test_results
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "badges_select_published"
on public.badges
for select
to authenticated
using (is_published or public.is_admin());

create policy "badges_admin_manage"
on public.badges
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "user_badges_own"
on public.user_badges
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "daily_tasks_select_published"
on public.daily_tasks
for select
to authenticated
using (is_published or public.is_admin());

create policy "daily_tasks_admin_manage"
on public.daily_tasks
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "weakness_quests_select_published"
on public.weakness_quests
for select
to authenticated
using (is_published or public.is_admin());

create policy "weakness_quests_admin_manage"
on public.weakness_quests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "user_progress_snapshots_own"
on public.user_progress_snapshots
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "flashcard_sessions_own"
on public.flashcard_sessions
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "flashcard_reviews_own"
on public.flashcard_reviews
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('speaking-submissions', 'speaking-submissions', false)
on conflict (id) do nothing;

create policy "avatars_public_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

create policy "avatars_own_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_own_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_own_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "speaking_submissions_own_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'speaking-submissions'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

create policy "speaking_submissions_own_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'speaking-submissions'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "speaking_submissions_own_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'speaking-submissions'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
)
with check (
  bucket_id = 'speaking-submissions'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

create policy "speaking_submissions_own_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'speaking-submissions'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);
