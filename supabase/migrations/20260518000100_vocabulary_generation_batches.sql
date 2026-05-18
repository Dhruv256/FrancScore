create extension if not exists pgcrypto;

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

create table if not exists public.vocabulary_generation_batches (
  id uuid primary key default gen_random_uuid(),
  generated_by uuid references public.profiles(id) on delete set null,
  source text not null default 'ai_daily',
  requested_count integer not null default 50,
  generated_count integer not null default 0,
  inserted_count integer not null default 0,
  duplicate_count integer not null default 0,
  failed_count integer not null default 0,
  model text,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.vocabulary_generation_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.vocabulary_generation_batches(id) on delete cascade,
  vocabulary_id uuid references public.vocabulary(id) on delete set null,
  french_word text,
  status text not null default 'pending',
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists vocabulary_generation_batches_created_at_idx
  on public.vocabulary_generation_batches(created_at desc);
create index if not exists vocabulary_generation_batches_source_idx
  on public.vocabulary_generation_batches(source);
create index if not exists vocabulary_generation_items_batch_idx
  on public.vocabulary_generation_items(batch_id);
create index if not exists vocabulary_generation_items_status_idx
  on public.vocabulary_generation_items(status);

alter table public.vocabulary_generation_batches enable row level security;
alter table public.vocabulary_generation_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vocabulary_generation_batches' and policyname = 'Admins can manage vocabulary generation batches') then
    create policy "Admins can manage vocabulary generation batches"
      on public.vocabulary_generation_batches for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vocabulary_generation_items' and policyname = 'Admins can manage vocabulary generation items') then
    create policy "Admins can manage vocabulary generation items"
      on public.vocabulary_generation_items for all
      to authenticated
      using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;
end $$;

notify pgrst, 'reload schema';
