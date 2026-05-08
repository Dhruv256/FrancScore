create extension if not exists pgcrypto;

alter table public.vocabulary add column if not exists source_import_id uuid;
alter table public.vocabulary add column if not exists import_confidence numeric;

create table if not exists public.vocabulary_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text,
  total_rows integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  concept_count integer not null default 0,
  duplicate_count integer not null default 0,
  ai_cleaned_count integer not null default 0,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.vocabulary_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.vocabulary_import_batches(id) on delete cascade,
  row_number integer not null,
  raw_json jsonb not null default '{}',
  detected_type text,
  action_taken text not null default 'needs_review',
  reason text,
  normalized_json jsonb,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  french_example text,
  english_explanation text,
  level text,
  topic text,
  exam_type text not null default 'BOTH',
  tags text[] not null default '{}',
  source_import_id uuid references public.vocabulary_import_batches(id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vocabulary_source_import_idx on public.vocabulary(source_import_id);
create index if not exists vocabulary_import_rows_batch_idx on public.vocabulary_import_rows(batch_id);
create unique index if not exists concepts_title_topic_idx on public.concepts(lower(title), coalesce(topic, ''));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_concepts_updated_at on public.concepts;
create trigger set_concepts_updated_at
before update on public.concepts
for each row execute function public.set_updated_at();

alter table public.vocabulary_import_batches enable row level security;
alter table public.vocabulary_import_rows enable row level security;
alter table public.concepts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vocabulary_import_batches' and policyname = 'Admins can manage vocabulary import batches') then
    create policy "Admins can manage vocabulary import batches"
      on public.vocabulary_import_batches for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vocabulary_import_rows' and policyname = 'Admins can manage vocabulary import rows') then
    create policy "Admins can manage vocabulary import rows"
      on public.vocabulary_import_rows for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'concepts' and policyname = 'Authenticated users can read published concepts') then
    create policy "Authenticated users can read published concepts"
      on public.concepts for select
      to authenticated
      using (is_published = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'concepts' and policyname = 'Admins can manage concepts') then
    create policy "Admins can manage concepts"
      on public.concepts for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

notify pgrst, 'reload schema';
