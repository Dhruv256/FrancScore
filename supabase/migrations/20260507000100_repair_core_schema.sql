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

create or replace function public.sync_profile_progress_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.total_xp := coalesce(new.total_xp, new.xp, 0);
    new.xp := coalesce(new.xp, new.total_xp, 0);
    new.current_streak := coalesce(new.current_streak, new.streak_count, 0);
    new.streak_count := coalesce(new.streak_count, new.current_streak, 0);
    return new;
  end if;

  if new.total_xp is distinct from old.total_xp then
    new.xp := new.total_xp;
  elsif new.xp is distinct from old.xp then
    new.total_xp := new.xp;
  else
    new.total_xp := coalesce(new.total_xp, old.total_xp, new.xp, old.xp, 0);
    new.xp := coalesce(new.xp, old.xp, new.total_xp, old.total_xp, 0);
  end if;

  if new.current_streak is distinct from old.current_streak then
    new.streak_count := new.current_streak;
  elsif new.streak_count is distinct from old.streak_count then
    new.current_streak := new.streak_count;
  else
    new.current_streak := coalesce(new.current_streak, old.current_streak, new.streak_count, old.streak_count, 0);
    new.streak_count := coalesce(new.streak_count, old.streak_count, new.current_streak, old.current_streak, 0);
  end if;

  return new;
end;
$$;

create or replace function public.ensure_updated_at_trigger(target_table text)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = target_table || '_set_updated_at'
      and tgrelid = to_regclass('public.' || target_table)
  ) then
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      target_table || '_set_updated_at',
      target_table
    );
  end if;
end;
$$;

create or replace function public.ensure_policy(
  target_table text,
  policy_name text,
  policy_sql text
)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = target_table
      and policyname = policy_name
  ) then
    execute format('create policy %I on public.%I %s', policy_name, target_table, policy_sql);
  end if;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'USER',
  target_exam text,
  target_level text,
  exam_date date,
  current_level_self_assessment text,
  weakest_skill text,
  daily_time_minutes integer,
  onboarding_completed boolean not null default false,
  xp integer not null default 0,
  streak_count integer not null default 0,
  last_active_date date,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  total_xp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists role text not null default 'USER',
  add column if not exists target_exam text,
  add column if not exists target_level text,
  add column if not exists exam_date date,
  add column if not exists current_level_self_assessment text,
  add column if not exists weakest_skill text,
  add column if not exists daily_time_minutes integer,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists xp integer not null default 0,
  add column if not exists streak_count integer not null default 0,
  add column if not exists last_active_date date,
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists total_xp integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set
  xp = coalesce(total_xp, xp, 0),
  streak_count = coalesce(current_streak, streak_count, 0)
where xp is null
   or streak_count is null
   or xp <> coalesce(total_xp, xp, 0)
   or streak_count <> coalesce(current_streak, streak_count, 0);

create table if not exists public.passages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  transcript text,
  audio_url text,
  type text not null default 'reading',
  exam_type text not null default 'BOTH',
  skill text,
  cefr_level text not null default 'B1',
  topic text,
  is_published boolean not null default false,
  word_count integer,
  estimated_minutes integer,
  highlighted_vocabulary text[] default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.passages
  add column if not exists content text,
  add column if not exists transcript text,
  add column if not exists audio_url text,
  add column if not exists type text not null default 'reading',
  add column if not exists exam_type text not null default 'BOTH',
  add column if not exists skill text,
  add column if not exists cefr_level text not null default 'B1',
  add column if not exists topic text,
  add column if not exists is_published boolean not null default false,
  add column if not exists word_count integer,
  add column if not exists estimated_minutes integer,
  add column if not exists highlighted_vocabulary text[] default '{}',
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid references public.passages(id) on delete set null,
  exam_type text not null default 'BOTH',
  skill text not null default 'READING',
  skill_type text not null default 'READING',
  cefr_level text not null default 'B1',
  topic text,
  trap_type text,
  difficulty text default 'medium',
  question_text text not null,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_option text,
  options jsonb not null default '[]'::jsonb,
  correct_answer_index integer not null default 0,
  explanation text,
  transcript text,
  audio_url text,
  metadata jsonb default '{}'::jsonb,
  tags text[] default '{}',
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.questions
  add column if not exists passage_id uuid references public.passages(id) on delete set null,
  add column if not exists exam_type text not null default 'BOTH',
  add column if not exists skill text not null default 'READING',
  add column if not exists skill_type text not null default 'READING',
  add column if not exists cefr_level text not null default 'B1',
  add column if not exists topic text,
  add column if not exists trap_type text,
  add column if not exists difficulty text default 'medium',
  add column if not exists question_text text,
  add column if not exists option_a text,
  add column if not exists option_b text,
  add column if not exists option_c text,
  add column if not exists option_d text,
  add column if not exists correct_option text,
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists correct_answer_index integer not null default 0,
  add column if not exists explanation text,
  add column if not exists transcript text,
  add column if not exists audio_url text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists tags text[] default '{}',
  add column if not exists is_published boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  french_word text not null,
  english_meaning text not null,
  french_example text,
  english_example_translation text,
  cefr_level text not null default 'B1',
  topic text,
  exam_type text not null default 'BOTH',
  frequency_score integer not null default 0,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.vocabulary
  add column if not exists french_word text,
  add column if not exists english_meaning text,
  add column if not exists french_example text,
  add column if not exists english_example_translation text,
  add column if not exists cefr_level text not null default 'B1',
  add column if not exists topic text,
  add column if not exists exam_type text not null default 'BOTH',
  add column if not exists frequency_score integer not null default 0,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_published boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.user_word_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  status text not null default 'new',
  ease_score numeric not null default 2.5,
  review_count integer not null default 0,
  mistake_count integer not null default 0,
  correct_count integer not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, vocabulary_id)
);

alter table if exists public.user_word_bank
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists vocabulary_id uuid references public.vocabulary(id) on delete cascade,
  add column if not exists status text not null default 'new',
  add column if not exists ease_score numeric not null default 2.5,
  add column if not exists review_count integer not null default 0,
  add column if not exists mistake_count integer not null default 0,
  add column if not exists correct_count integer not null default 0,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists next_review_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists user_word_bank_user_vocabulary_unique
  on public.user_word_bank (user_id, vocabulary_id);

create table if not exists public.flashcard_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_type text not null,
  cards_reviewed integer not null default 0,
  mastered_count integer not null default 0,
  weak_count integer not null default 0,
  xp_earned integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table if exists public.flashcard_sessions
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists deck_type text,
  add column if not exists cards_reviewed integer not null default 0,
  add column if not exists mastered_count integer not null default 0,
  add column if not exists weak_count integer not null default 0,
  add column if not exists xp_earned integer not null default 0,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz;

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.flashcard_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  rating text not null,
  previous_status text,
  new_status text,
  xp_earned integer not null default 0,
  reviewed_at timestamptz not null default now()
);

alter table if exists public.flashcard_reviews
  add column if not exists session_id uuid references public.flashcard_sessions(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists vocabulary_id uuid references public.vocabulary(id) on delete cascade,
  add column if not exists rating text,
  add column if not exists previous_status text,
  add column if not exists new_status text,
  add column if not exists xp_earned integer not null default 0,
  add column if not exists reviewed_at timestamptz not null default now();

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option text,
  selected_answer_index integer,
  is_correct boolean,
  response_time_ms integer,
  time_taken_seconds integer,
  metadata jsonb default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table if exists public.attempts
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists question_id uuid references public.questions(id) on delete cascade,
  add column if not exists selected_option text,
  add column if not exists selected_answer_index integer,
  add column if not exists is_correct boolean,
  add column if not exists response_time_ms integer,
  add column if not exists time_taken_seconds integer,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  exam_type text not null default 'BOTH',
  task_type text,
  type text,
  cefr_level text not null default 'B1',
  title text,
  prompt_text text,
  prompt text,
  target_word_min integer,
  target_word_max integer,
  word_limit_min integer,
  word_limit_max integer,
  criteria jsonb default '[]'::jsonb,
  sample_response text,
  topic text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.writing_prompts
  add column if not exists exam_type text not null default 'BOTH',
  add column if not exists task_type text,
  add column if not exists type text,
  add column if not exists cefr_level text not null default 'B1',
  add column if not exists title text,
  add column if not exists prompt_text text,
  add column if not exists prompt text,
  add column if not exists target_word_min integer,
  add column if not exists target_word_max integer,
  add column if not exists word_limit_min integer,
  add column if not exists word_limit_max integer,
  add column if not exists criteria jsonb default '[]'::jsonb,
  add column if not exists sample_response text,
  add column if not exists topic text,
  add column if not exists is_published boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.writing_prompts
set
  prompt_text = coalesce(prompt_text, prompt),
  prompt = coalesce(prompt, prompt_text),
  task_type = coalesce(task_type, type),
  type = coalesce(type, task_type),
  target_word_min = coalesce(target_word_min, word_limit_min),
  target_word_max = coalesce(target_word_max, word_limit_max),
  word_limit_min = coalesce(word_limit_min, target_word_min),
  word_limit_max = coalesce(word_limit_max, target_word_max);

create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid references public.writing_prompts(id) on delete set null,
  answer_text text,
  submitted_text text,
  word_count integer,
  ai_feedback jsonb,
  review_result jsonb,
  estimated_cefr text,
  score_20 numeric,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.writing_submissions
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists prompt_id uuid references public.writing_prompts(id) on delete set null,
  add column if not exists answer_text text,
  add column if not exists submitted_text text,
  add column if not exists word_count integer,
  add column if not exists ai_feedback jsonb,
  add column if not exists review_result jsonb,
  add column if not exists estimated_cefr text,
  add column if not exists score_20 numeric,
  add column if not exists status text not null default 'submitted',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.writing_submissions
set
  answer_text = coalesce(answer_text, submitted_text),
  submitted_text = coalesce(submitted_text, answer_text),
  ai_feedback = coalesce(ai_feedback, review_result),
  review_result = coalesce(review_result, ai_feedback);

create table if not exists public.speaking_prompts (
  id uuid primary key default gen_random_uuid(),
  exam_type text not null default 'BOTH',
  task_type text,
  type text,
  cefr_level text not null default 'B1',
  title text,
  prompt_text text,
  prompt text,
  preparation_seconds integer,
  speaking_seconds integer,
  duration_seconds integer,
  criteria jsonb default '[]'::jsonb,
  topic text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.speaking_prompts
  add column if not exists exam_type text not null default 'BOTH',
  add column if not exists task_type text,
  add column if not exists type text,
  add column if not exists cefr_level text not null default 'B1',
  add column if not exists title text,
  add column if not exists prompt_text text,
  add column if not exists prompt text,
  add column if not exists preparation_seconds integer,
  add column if not exists speaking_seconds integer,
  add column if not exists duration_seconds integer,
  add column if not exists criteria jsonb default '[]'::jsonb,
  add column if not exists topic text,
  add column if not exists is_published boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.speaking_prompts
set
  prompt_text = coalesce(prompt_text, prompt),
  prompt = coalesce(prompt, prompt_text),
  task_type = coalesce(task_type, type),
  type = coalesce(type, task_type),
  speaking_seconds = coalesce(speaking_seconds, duration_seconds),
  duration_seconds = coalesce(duration_seconds, speaking_seconds);

create table if not exists public.speaking_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid references public.speaking_prompts(id) on delete set null,
  transcript text,
  audio_url text,
  audio_path text,
  ai_feedback jsonb,
  review_result jsonb,
  estimated_cefr text,
  score_20 numeric,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.speaking_submissions
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists prompt_id uuid references public.speaking_prompts(id) on delete set null,
  add column if not exists transcript text,
  add column if not exists audio_url text,
  add column if not exists audio_path text,
  add column if not exists ai_feedback jsonb,
  add column if not exists review_result jsonb,
  add column if not exists estimated_cefr text,
  add column if not exists score_20 numeric,
  add column if not exists status text not null default 'submitted',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.speaking_submissions
set
  audio_url = coalesce(audio_url, audio_path),
  audio_path = coalesce(audio_path, audio_url),
  ai_feedback = coalesce(ai_feedback, review_result),
  review_result = coalesce(review_result, ai_feedback);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  icon text,
  category text,
  requirement text,
  xp_reward integer not null default 0,
  criteria jsonb,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.badges
  add column if not exists code text,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists icon text,
  add column if not exists category text,
  add column if not exists requirement text,
  add column if not exists xp_reward integer not null default 0,
  add column if not exists criteria jsonb,
  add column if not exists is_published boolean not null default true,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists badges_code_unique
  on public.badges (code)
  where code is not null;

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  progress integer not null default 0,
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

alter table if exists public.user_badges
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists badge_id uuid references public.badges(id) on delete cascade,
  add column if not exists progress integer not null default 0,
  add column if not exists earned_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists user_badges_user_badge_unique
  on public.user_badges (user_id, badge_id);

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  exam_type text not null default 'MIXED',
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.mock_tests
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists exam_type text not null default 'MIXED',
  add column if not exists is_published boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.mock_test_sections (
  id uuid primary key default gen_random_uuid(),
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  skill_type text not null,
  sort_order integer not null default 0,
  question_count integer not null default 0,
  duration_minutes integer not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.mock_test_sections
  add column if not exists mock_test_id uuid references public.mock_tests(id) on delete cascade,
  add column if not exists skill_type text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists question_count integer not null default 0,
  add column if not exists duration_minutes integer not null default 0,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.mock_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  overall_score numeric,
  cefr_estimate text,
  skill_breakdown jsonb,
  repair_plan jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table if exists public.mock_test_results
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists mock_test_id uuid references public.mock_tests(id) on delete cascade,
  add column if not exists overall_score numeric,
  add column if not exists cefr_estimate text,
  add column if not exists skill_breakdown jsonb,
  add column if not exists repair_plan jsonb,
  add column if not exists completed_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  skill_type text not null,
  xp_reward integer not null default 0,
  estimated_minutes integer not null default 0,
  icon text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.daily_tasks
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists skill_type text,
  add column if not exists xp_reward integer not null default 0,
  add column if not exists estimated_minutes integer not null default 0,
  add column if not exists icon text,
  add column if not exists is_published boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.weakness_quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  skill_type text not null,
  trap_type text,
  questions_count integer not null default 0,
  xp_reward integer not null default 0,
  difficulty text not null default 'MEDIUM',
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.weakness_quests
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists skill_type text,
  add column if not exists trap_type text,
  add column if not exists questions_count integer not null default 0,
  add column if not exists xp_reward integer not null default 0,
  add column if not exists difficulty text not null default 'MEDIUM',
  add column if not exists is_published boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.user_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  overall_readiness numeric,
  cefr_estimate text,
  listening_score numeric,
  reading_score numeric,
  writing_score numeric,
  speaking_score numeric,
  vocabulary_score numeric,
  snapshot_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table if exists public.user_progress_snapshots
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists overall_readiness numeric,
  add column if not exists cefr_estimate text,
  add column if not exists listening_score numeric,
  add column if not exists reading_score numeric,
  add column if not exists writing_score numeric,
  add column if not exists speaking_score numeric,
  add column if not exists vocabulary_score numeric,
  add column if not exists snapshot_date date not null default current_date,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  feature text not null,
  provider text not null default 'nvidia',
  model text,
  success boolean not null default true,
  error_message text,
  tokens_input integer,
  tokens_output integer,
  cost_estimate numeric(10,4),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.ai_usage_logs
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists feature text,
  add column if not exists provider text not null default 'nvidia',
  add column if not exists model text,
  add column if not exists success boolean not null default true,
  add column if not exists error_message text,
  add column if not exists tokens_input integer,
  add column if not exists tokens_output integer,
  add column if not exists cost_estimate numeric(10,4),
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists ai_usage_logs_user_feature_created_at_idx
  on public.ai_usage_logs (user_id, feature, created_at desc);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    onboarding_completed,
    total_xp,
    xp,
    current_streak,
    streak_count
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    'USER',
    false,
    0,
    0,
    0,
    0
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_sync_progress_fields on public.profiles;
create trigger profiles_sync_progress_fields
before insert or update on public.profiles
for each row execute function public.sync_profile_progress_fields();

select public.ensure_updated_at_trigger('profiles');
select public.ensure_updated_at_trigger('passages');
select public.ensure_updated_at_trigger('questions');
select public.ensure_updated_at_trigger('vocabulary');
select public.ensure_updated_at_trigger('user_word_bank');
select public.ensure_updated_at_trigger('writing_prompts');
select public.ensure_updated_at_trigger('writing_submissions');
select public.ensure_updated_at_trigger('speaking_prompts');
select public.ensure_updated_at_trigger('speaking_submissions');
select public.ensure_updated_at_trigger('badges');
select public.ensure_updated_at_trigger('mock_tests');
select public.ensure_updated_at_trigger('daily_tasks');
select public.ensure_updated_at_trigger('weakness_quests');

alter table public.profiles enable row level security;
alter table public.passages enable row level security;
alter table public.questions enable row level security;
alter table public.vocabulary enable row level security;
alter table public.user_word_bank enable row level security;
alter table public.flashcard_sessions enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.attempts enable row level security;
alter table public.writing_prompts enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.speaking_prompts enable row level security;
alter table public.speaking_submissions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_test_sections enable row level security;
alter table public.mock_test_results enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.weakness_quests enable row level security;
alter table public.user_progress_snapshots enable row level security;
alter table public.ai_usage_logs enable row level security;

select public.ensure_policy(
  'profiles',
  'profiles_select_own',
  'for select to authenticated using (auth.uid() = id or public.is_admin())'
);
select public.ensure_policy(
  'profiles',
  'profiles_insert_own',
  'for insert to authenticated with check (auth.uid() = id or public.is_admin())'
);
select public.ensure_policy(
  'profiles',
  'profiles_update_own',
  'for update to authenticated using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin())'
);

select public.ensure_policy(
  'passages',
  'passages_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'passages',
  'passages_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'questions',
  'questions_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'questions',
  'questions_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'vocabulary',
  'vocabulary_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'vocabulary',
  'vocabulary_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'writing_prompts',
  'writing_prompts_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'writing_prompts',
  'writing_prompts_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'speaking_prompts',
  'speaking_prompts_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'speaking_prompts',
  'speaking_prompts_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'badges',
  'badges_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'badges',
  'badges_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'daily_tasks',
  'daily_tasks_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'daily_tasks',
  'daily_tasks_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'weakness_quests',
  'weakness_quests_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'weakness_quests',
  'weakness_quests_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'mock_tests',
  'mock_tests_select_published',
  'for select to authenticated using (is_published or public.is_admin())'
);
select public.ensure_policy(
  'mock_tests',
  'mock_tests_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'mock_test_sections',
  'mock_test_sections_select_published',
  'for select to authenticated using (exists (select 1 from public.mock_tests where mock_tests.id = mock_test_sections.mock_test_id and (mock_tests.is_published or public.is_admin())))'
);
select public.ensure_policy(
  'mock_test_sections',
  'mock_test_sections_admin_manage',
  'for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

select public.ensure_policy(
  'user_word_bank',
  'user_word_bank_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'user_word_bank',
  'user_word_bank_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'user_word_bank',
  'user_word_bank_update_own',
  'for update to authenticated using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'attempts',
  'attempts_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'attempts',
  'attempts_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'flashcard_sessions',
  'flashcard_sessions_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'flashcard_sessions',
  'flashcard_sessions_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'flashcard_sessions',
  'flashcard_sessions_update_own',
  'for update to authenticated using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'flashcard_reviews',
  'flashcard_reviews_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'flashcard_reviews',
  'flashcard_reviews_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'writing_submissions',
  'writing_submissions_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'writing_submissions',
  'writing_submissions_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'writing_submissions',
  'writing_submissions_update_own',
  'for update to authenticated using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'speaking_submissions',
  'speaking_submissions_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'speaking_submissions',
  'speaking_submissions_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'speaking_submissions',
  'speaking_submissions_update_own',
  'for update to authenticated using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'mock_test_results',
  'mock_test_results_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'mock_test_results',
  'mock_test_results_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'user_progress_snapshots',
  'user_progress_snapshots_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'user_progress_snapshots',
  'user_progress_snapshots_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'user_progress_snapshots',
  'user_progress_snapshots_update_own',
  'for update to authenticated using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'user_badges',
  'user_badges_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'user_badges',
  'user_badges_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'user_badges',
  'user_badges_update_own',
  'for update to authenticated using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin())'
);

select public.ensure_policy(
  'ai_usage_logs',
  'ai_usage_logs_read_own',
  'for select to authenticated using (auth.uid() = user_id or public.is_admin())'
);
select public.ensure_policy(
  'ai_usage_logs',
  'ai_usage_logs_insert_own',
  'for insert to authenticated with check (auth.uid() = user_id or public.is_admin())'
);

notify pgrst, 'reload schema';
