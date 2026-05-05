# FrancScore

FrancScore is a Next.js App Router + TypeScript application for TEF/TCF French exam preparation.

## Supabase Migrations

The repository now includes a Supabase foundation under `supabase/`:

- `supabase/migrations/20260504_001_initial_foundation.sql`
- `supabase/seed.sql`

### Required environment variables

Set these before using the Supabase clients:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
DIRECT_URL=...
```

Only `NEXT_PUBLIC_*` variables are safe for browser code. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
`DATABASE_URL` and `DIRECT_URL` are server-only and intended for schema work, migration tooling, and direct database access.

### Apply migrations

If you have the Supabase CLI installed and the project linked:

```bash
supabase db push
```

To rebuild a local development database from migrations and apply the seed:

```bash
supabase db reset
```

### Manual SQL Editor fallback

This repository does not currently include a linked `supabase/config.toml`, so a safe fallback is to run the SQL manually in the Supabase SQL Editor:

1. Apply all files in `supabase/migrations/` in filename order.
2. Apply `supabase/seed.sql`.
3. Regenerate `src/lib/supabase/database.types.ts` from a linked environment when the Supabase CLI is available.

To run the seed manually from a Postgres client:

```bash
psql "$DIRECT_URL" -f supabase/seed.sql
```

### What the initial schema includes

- Auth-backed `profiles` with `USER` and `ADMIN` roles
- Practice content tables for questions, passages, vocabulary, prompts, mock tests, badges, and quests
- User-owned tables for attempts, submissions, word-bank progress, badges, snapshots, and flashcard reviews
- RLS policies for:
  - own-profile access
  - published content reads
  - own attempts/submissions/progress
  - admin content management
- Storage bucket foundations for listening audio, speaking audio, user uploads, avatars, and speaking submissions
