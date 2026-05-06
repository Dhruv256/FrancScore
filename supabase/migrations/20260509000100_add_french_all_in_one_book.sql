create extension if not exists pgcrypto;

create table if not exists public.book_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null default 'pdf',
  file_name text,
  storage_path text,
  total_pages integer,
  is_internal boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_chapters (
  id uuid primary key default gen_random_uuid(),
  book_source_id uuid references public.book_sources(id) on delete cascade,
  chapter_number integer,
  title text not null,
  start_page integer,
  end_page integer,
  section_type text default 'lesson',
  cefr_level text default 'B1',
  skill_focus text[] default '{}',
  order_index integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_pages (
  id uuid primary key default gen_random_uuid(),
  book_source_id uuid references public.book_sources(id) on delete cascade,
  chapter_id uuid references public.book_chapters(id) on delete set null,
  page_number integer not null,
  raw_text text,
  cleaned_text text,
  page_type text default 'content',
  created_at timestamptz not null default now()
);

create table if not exists public.book_chunks (
  id uuid primary key default gen_random_uuid(),
  book_source_id uuid references public.book_sources(id) on delete cascade,
  chapter_id uuid references public.book_chapters(id) on delete set null,
  page_start integer,
  page_end integer,
  chunk_index integer,
  chunk_text text not null,
  chunk_type text default 'lesson',
  headings text[] default '{}',
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.book_notes (
  id uuid primary key default gen_random_uuid(),
  book_source_id uuid references public.book_sources(id) on delete cascade,
  chapter_id uuid references public.book_chapters(id) on delete cascade,
  note_type text not null,
  title text not null,
  content_md text not null,
  key_points jsonb default '[]',
  examples jsonb default '[]',
  cefr_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_generated_items (
  id uuid primary key default gen_random_uuid(),
  book_source_id uuid references public.book_sources(id) on delete cascade,
  chapter_id uuid references public.book_chapters(id) on delete set null,
  source_chunk_id uuid references public.book_chunks(id) on delete set null,
  item_type text not null,
  item_json jsonb not null,
  difficulty text default 'medium',
  cefr_level text default 'B1',
  tags text[] default '{}',
  is_saved_to_practice_bank boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_book_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  book_source_id uuid references public.book_sources(id) on delete cascade,
  chapter_id uuid references public.book_chapters(id) on delete cascade,
  status text not null default 'not_started',
  completion_percent integer not null default 0,
  pages_read integer default 0,
  notes_completed boolean not null default false,
  flashcards_reviewed integer not null default 0,
  quiz_score numeric,
  last_page_read integer,
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, book_source_id, chapter_id)
);

create table if not exists public.user_book_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  book_generated_item_id uuid references public.book_generated_items(id) on delete cascade,
  answer_text text,
  selected_option text,
  is_correct boolean,
  ai_feedback jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.book_import_reports (
  id uuid primary key default gen_random_uuid(),
  book_source_id uuid references public.book_sources(id) on delete cascade,
  report_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.book_sources add column if not exists title text;
alter table public.book_sources add column if not exists source_type text not null default 'pdf';
alter table public.book_sources add column if not exists file_name text;
alter table public.book_sources add column if not exists storage_path text;
alter table public.book_sources add column if not exists total_pages integer;
alter table public.book_sources add column if not exists is_internal boolean not null default true;
alter table public.book_sources add column if not exists is_active boolean not null default true;
alter table public.book_sources add column if not exists updated_at timestamptz not null default now();

alter table public.book_chapters add column if not exists skill_focus text[] default '{}';
alter table public.book_pages add column if not exists cleaned_text text;
alter table public.book_chunks add column if not exists headings text[] default '{}';
alter table public.book_chunks add column if not exists metadata jsonb default '{}';
alter table public.book_generated_items add column if not exists is_saved_to_practice_bank boolean not null default false;

create unique index if not exists book_sources_active_title_idx
  on public.book_sources (lower(title))
  where is_active = true;

create unique index if not exists book_chapters_source_order_idx
  on public.book_chapters (book_source_id, order_index);

create unique index if not exists book_pages_source_page_idx
  on public.book_pages (book_source_id, page_number);

create unique index if not exists book_chunks_source_chapter_index_idx
  on public.book_chunks (book_source_id, chapter_id, chunk_index);

create unique index if not exists book_notes_chapter_type_idx
  on public.book_notes (chapter_id, note_type);

create index if not exists book_chunks_search_idx
  on public.book_chunks using gin (to_tsvector('simple', chunk_text));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_book_sources_updated_at on public.book_sources;
create trigger set_book_sources_updated_at
before update on public.book_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_book_chapters_updated_at on public.book_chapters;
create trigger set_book_chapters_updated_at
before update on public.book_chapters
for each row execute function public.set_updated_at();

drop trigger if exists set_book_notes_updated_at on public.book_notes;
create trigger set_book_notes_updated_at
before update on public.book_notes
for each row execute function public.set_updated_at();

drop trigger if exists set_user_book_progress_updated_at on public.user_book_progress;
create trigger set_user_book_progress_updated_at
before update on public.user_book_progress
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  );
$$;

alter table public.book_sources enable row level security;
alter table public.book_chapters enable row level security;
alter table public.book_pages enable row level security;
alter table public.book_chunks enable row level security;
alter table public.book_notes enable row level security;
alter table public.book_generated_items enable row level security;
alter table public.user_book_progress enable row level security;
alter table public.user_book_answers enable row level security;
alter table public.book_import_reports enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'book_sources' and policyname = 'Authenticated users can read active internal book sources') then
    create policy "Authenticated users can read active internal book sources"
      on public.book_sources for select
      to authenticated
      using (is_active = true and is_internal = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'book_chapters' and policyname = 'Authenticated users can read book chapters') then
    create policy "Authenticated users can read book chapters"
      on public.book_chapters for select
      to authenticated
      using (exists (
        select 1 from public.book_sources s
        where s.id = book_source_id and s.is_active = true and s.is_internal = true
      ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'book_pages' and policyname = 'Authenticated users can read book pages') then
    create policy "Authenticated users can read book pages"
      on public.book_pages for select
      to authenticated
      using (exists (
        select 1 from public.book_sources s
        where s.id = book_source_id and s.is_active = true and s.is_internal = true
      ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'book_chunks' and policyname = 'Authenticated users can read book chunks') then
    create policy "Authenticated users can read book chunks"
      on public.book_chunks for select
      to authenticated
      using (exists (
        select 1 from public.book_sources s
        where s.id = book_source_id and s.is_active = true and s.is_internal = true
      ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'book_notes' and policyname = 'Authenticated users can read book notes') then
    create policy "Authenticated users can read book notes"
      on public.book_notes for select
      to authenticated
      using (exists (
        select 1 from public.book_sources s
        where s.id = book_source_id and s.is_active = true and s.is_internal = true
      ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'book_generated_items' and policyname = 'Authenticated users can read book generated items') then
    create policy "Authenticated users can read book generated items"
      on public.book_generated_items for select
      to authenticated
      using (exists (
        select 1 from public.book_sources s
        where s.id = book_source_id and s.is_active = true and s.is_internal = true
      ));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_book_progress' and policyname = 'Users can manage their own book progress') then
    create policy "Users can manage their own book progress"
      on public.user_book_progress for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_book_answers' and policyname = 'Users can manage their own book answers') then
    create policy "Users can manage their own book answers"
      on public.user_book_answers for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'book_import_reports' and policyname = 'Admins can read book import reports') then
    create policy "Admins can read book import reports"
      on public.book_import_reports for select
      to authenticated
      using (public.is_admin());
  end if;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'book_sources',
    'book_chapters',
    'book_pages',
    'book_chunks',
    'book_notes',
    'book_generated_items',
    'book_import_reports'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      'Admins can manage ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      'Admins can manage ' || table_name,
      table_name
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
