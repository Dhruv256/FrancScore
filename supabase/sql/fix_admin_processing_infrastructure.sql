-- Emergency repair SQL for Supabase SQL Editor. Additive; does not delete user data.

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

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = user_id
      and profiles.role = 'ADMIN'
  );
$$;

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  job_type text not null,
  status text not null default 'queued',
  progress integer not null default 0,
  total_steps integer,
  current_step text,
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.processing_jobs
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists job_type text,
  add column if not exists status text not null default 'queued',
  add column if not exists progress integer not null default 0,
  add column if not exists total_steps integer,
  add column if not exists current_step text,
  add column if not exists input_json jsonb not null default '{}'::jsonb,
  add column if not exists result_json jsonb not null default '{}'::jsonb,
  add column if not exists error_message text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.processing_jobs
  drop constraint if exists processing_jobs_status_check,
  add constraint processing_jobs_status_check
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled'));

create index if not exists processing_jobs_user_id_idx on public.processing_jobs(user_id);
create index if not exists processing_jobs_status_idx on public.processing_jobs(status);
create index if not exists processing_jobs_job_type_idx on public.processing_jobs(job_type);
create index if not exists processing_jobs_created_at_idx on public.processing_jobs(created_at desc);
create index if not exists processing_jobs_user_status_idx on public.processing_jobs(user_id, status);
create index if not exists processing_jobs_job_type_status_idx on public.processing_jobs(job_type, status);

drop trigger if exists set_processing_jobs_updated_at on public.processing_jobs;
create trigger set_processing_jobs_updated_at
before update on public.processing_jobs
for each row execute function public.set_updated_at();

alter table public.processing_jobs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'processing_jobs' and policyname = 'Users can read own processing jobs') then
    create policy "Users can read own processing jobs"
      on public.processing_jobs for select
      to authenticated
      using (user_id = auth.uid() or public.is_admin(auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'processing_jobs' and policyname = 'Users can create own processing jobs') then
    create policy "Users can create own processing jobs"
      on public.processing_jobs for insert
      to authenticated
      with check (user_id = auth.uid() or public.is_admin(auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'processing_jobs' and policyname = 'Admins can manage processing jobs') then
    create policy "Admins can manage processing jobs"
      on public.processing_jobs for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;
end $$;

create table if not exists public.daily_vocab_generations (
  id uuid primary key default gen_random_uuid(),
  generation_date date unique not null,
  model_used text,
  requested_count integer not null default 50,
  inserted_count integer not null default 0,
  skipped_duplicate_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'pending',
  error_message text,
  job_id uuid references public.processing_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.daily_vocab_generations
  add column if not exists job_id uuid references public.processing_jobs(id) on delete set null,
  add column if not exists error_message text,
  add column if not exists completed_at timestamptz;

alter table public.daily_vocab_generations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'daily_vocab_generations' and policyname = 'Admins can manage daily vocabulary generations') then
    create policy "Admins can manage daily vocabulary generations"
      on public.daily_vocab_generations for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('pdf-imports', 'pdf-imports', false)
on conflict (id) do nothing;

create table if not exists public.pdf_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  storage_path text,
  title text,
  total_pages integer not null default 0,
  total_chunks integer not null default 0,
  chapters_detected integer not null default 0,
  status text not null default 'pending',
  model_used text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.pdf_import_batches
  add column if not exists title text,
  add column if not exists chapters_detected integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.pdf_import_batches
  drop constraint if exists pdf_import_batches_status_check,
  add constraint pdf_import_batches_status_check
    check (status in ('pending', 'uploaded', 'extracting', 'chunking', 'processing', 'ready_for_review', 'imported', 'failed'));

create table if not exists public.pdf_import_chunks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.pdf_import_batches(id) on delete cascade,
  chunk_index integer not null,
  page_start integer,
  page_end integer,
  raw_text text,
  ai_status text not null default 'pending',
  ai_result_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(batch_id, chunk_index)
);

alter table public.pdf_import_chunks
  add column if not exists error_message text;

alter table public.pdf_import_chunks
  drop constraint if exists pdf_import_chunks_ai_status_check,
  add constraint pdf_import_chunks_ai_status_check
    check (ai_status in ('pending', 'processing', 'completed', 'failed', 'skipped'));

create table if not exists public.pdf_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.pdf_import_batches(id) on delete cascade,
  chunk_id uuid references public.pdf_import_chunks(id) on delete set null,
  item_type text not null,
  title text,
  content_json jsonb not null default '{}'::jsonb,
  suggested_destination text,
  confidence numeric not null default 0,
  status text not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pdf_import_items
  add column if not exists updated_at timestamptz not null default now();

alter table public.pdf_import_items
  drop constraint if exists pdf_import_items_status_check,
  add constraint pdf_import_items_status_check
    check (status in ('pending_review', 'approved', 'rejected', 'imported'));

create index if not exists pdf_import_batches_status_idx on public.pdf_import_batches(status);
create index if not exists pdf_import_batches_created_at_idx on public.pdf_import_batches(created_at desc);
create index if not exists pdf_import_chunks_batch_idx on public.pdf_import_chunks(batch_id);
create index if not exists pdf_import_chunks_batch_status_idx on public.pdf_import_chunks(batch_id, ai_status);
create index if not exists pdf_import_items_batch_idx on public.pdf_import_items(batch_id);
create index if not exists pdf_import_items_batch_status_idx on public.pdf_import_items(batch_id, status);
create index if not exists pdf_import_items_type_idx on public.pdf_import_items(item_type);

drop trigger if exists set_pdf_import_batches_updated_at on public.pdf_import_batches;
create trigger set_pdf_import_batches_updated_at
before update on public.pdf_import_batches
for each row execute function public.set_updated_at();

drop trigger if exists set_pdf_import_items_updated_at on public.pdf_import_items;
create trigger set_pdf_import_items_updated_at
before update on public.pdf_import_items
for each row execute function public.set_updated_at();

alter table public.pdf_import_batches enable row level security;
alter table public.pdf_import_chunks enable row level security;
alter table public.pdf_import_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pdf_import_batches' and policyname = 'Admins can manage PDF import batches') then
    create policy "Admins can manage PDF import batches"
      on public.pdf_import_batches for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pdf_import_chunks' and policyname = 'Admins can manage PDF import chunks') then
    create policy "Admins can manage PDF import chunks"
      on public.pdf_import_chunks for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pdf_import_items' and policyname = 'Admins can manage PDF import items') then
    create policy "Admins can manage PDF import items"
      on public.pdf_import_items for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;
end $$;

notify pgrst, 'reload schema';

-- Optional cleanup: unpublish obvious non-flashcard rows from noisy imports.
update public.vocabulary
set is_published = false,
    updated_at = now()
where lower(french_word) similar to '(day %|part %|concept|concepts|mini|vocabulary|70 high|1-40|41-70|71-100|collocations %)'
   or lower(english_meaning) in (
      'french study schedule',
      'frequency words',
      'high utility words',
      'abstract vocabulary',
      'verbs',
      'drills',
      'examples'
   );

notify pgrst, 'reload schema';
