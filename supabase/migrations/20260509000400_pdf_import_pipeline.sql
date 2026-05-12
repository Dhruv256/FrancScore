create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('pdf-imports', 'pdf-imports', false)
on conflict (id) do nothing;

create table if not exists public.pdf_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  storage_path text,
  total_pages integer not null default 0,
  total_chunks integer not null default 0,
  status text not null default 'pending',
  model_used text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.pdf_import_chunks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.pdf_import_batches(id) on delete cascade,
  chunk_index integer not null,
  page_start integer,
  page_end integer,
  raw_text text not null,
  ai_status text not null default 'pending',
  ai_result_json jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(batch_id, chunk_index)
);

create table if not exists public.pdf_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.pdf_import_batches(id) on delete cascade,
  chunk_id uuid references public.pdf_import_chunks(id) on delete set null,
  item_type text not null,
  title text,
  content_json jsonb not null default '{}',
  suggested_destination text,
  confidence numeric not null default 0,
  status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table if not exists public.generated_exercises (
  id uuid primary key default gen_random_uuid(),
  title text,
  exercise_type text not null,
  content_json jsonb not null default '{}',
  source_import_id uuid references public.pdf_import_batches(id) on delete set null,
  cefr_level text,
  topic text,
  exam_type text not null default 'BOTH',
  tags text[] not null default '{}',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pdf_import_chunks_batch_idx on public.pdf_import_chunks(batch_id);
create index if not exists pdf_import_items_batch_status_idx on public.pdf_import_items(batch_id, status);
create index if not exists pdf_import_items_type_idx on public.pdf_import_items(item_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_generated_exercises_updated_at on public.generated_exercises;
create trigger set_generated_exercises_updated_at
before update on public.generated_exercises
for each row execute function public.set_updated_at();

alter table public.pdf_import_batches enable row level security;
alter table public.pdf_import_chunks enable row level security;
alter table public.pdf_import_items enable row level security;
alter table public.generated_exercises enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pdf_import_batches' and policyname = 'Admins can manage PDF import batches') then
    create policy "Admins can manage PDF import batches"
      on public.pdf_import_batches for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pdf_import_chunks' and policyname = 'Admins can manage PDF import chunks') then
    create policy "Admins can manage PDF import chunks"
      on public.pdf_import_chunks for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pdf_import_items' and policyname = 'Admins can manage PDF import items') then
    create policy "Admins can manage PDF import items"
      on public.pdf_import_items for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'generated_exercises' and policyname = 'Authenticated users can read published generated exercises') then
    create policy "Authenticated users can read published generated exercises"
      on public.generated_exercises for select
      to authenticated
      using (is_published = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'generated_exercises' and policyname = 'Admins can manage generated exercises') then
    create policy "Admins can manage generated exercises"
      on public.generated_exercises for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

notify pgrst, 'reload schema';
