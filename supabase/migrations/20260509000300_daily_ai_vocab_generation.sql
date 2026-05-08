create extension if not exists pgcrypto;

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
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.daily_vocab_generations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_vocab_generations'
      and policyname = 'Admins can manage daily vocabulary generations'
  ) then
    create policy "Admins can manage daily vocabulary generations"
      on public.daily_vocab_generations
      for all
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'ADMIN'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'ADMIN'
        )
      );
  end if;
end $$;

notify pgrst, 'reload schema';
