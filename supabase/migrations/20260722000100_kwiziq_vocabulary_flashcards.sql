alter table public.vocabulary add column if not exists category_slug text;
alter table public.vocabulary add column if not exists broad_category text;
alter table public.vocabulary add column if not exists source text not null default 'legacy';
alter table public.vocabulary add column if not exists source_document text;
alter table public.vocabulary add column if not exists source_row_key text;
create unique index if not exists vocabulary_source_row_key_uidx on public.vocabulary(source_row_key) where source_row_key is not null;
alter table public.vocabulary enable row level security;
drop policy if exists "Public can read published vocabulary" on public.vocabulary;
create policy "Public can read published vocabulary" on public.vocabulary for select to anon, authenticated using (is_published = true);
