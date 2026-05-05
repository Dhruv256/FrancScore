do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'name'
  ) then
    alter table public.profiles rename column name to full_name;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'exam_type'
  ) then
    alter table public.profiles rename column exam_type to target_exam;
  end if;
end $$;

alter table public.profiles
  alter column full_name drop not null;

alter table public.profiles
  add column if not exists current_level_self_assessment text,
  add column if not exists weakest_skill text,
  add column if not exists daily_time_minutes integer,
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_target_level_check,
  add constraint profiles_target_level_check
    check (target_level is null or target_level in ('B2', 'CLB_7', 'CLB_8'));

alter table public.profiles
  drop constraint if exists profiles_target_exam_check,
  add constraint profiles_target_exam_check
    check (target_exam is null or target_exam in ('TEF_CANADA', 'TCF_CANADA', 'MIXED'));

alter table public.profiles
  drop constraint if exists profiles_current_level_self_assessment_check,
  add constraint profiles_current_level_self_assessment_check
    check (
      current_level_self_assessment is null
      or current_level_self_assessment in ('A2', 'B1', 'B1_PLUS', 'B2_MINUS')
    );

alter table public.profiles
  drop constraint if exists profiles_weakest_skill_check,
  add constraint profiles_weakest_skill_check
    check (
      weakest_skill is null
      or weakest_skill in ('LISTENING', 'READING', 'WRITING', 'SPEAKING', 'VOCABULARY')
    );

alter table public.profiles
  drop constraint if exists profiles_daily_time_minutes_check,
  add constraint profiles_daily_time_minutes_check
    check (daily_time_minutes is null or daily_time_minutes > 0);

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
