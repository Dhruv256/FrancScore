# Supabase Migrations

FrancScore admin features depend on the latest Supabase tables being present in production.

## Required Tables

- `public.processing_jobs`
- `public.daily_vocab_generations`
- `public.pdf_import_batches`
- `public.pdf_import_chunks`
- `public.pdf_import_items`

## Run With Supabase CLI

```bash
supabase db push
```

If this project is not linked locally, apply the SQL manually.

## Run In Supabase Dashboard

1. Open the Supabase dashboard.
2. Open SQL Editor.
3. Run `supabase/migrations/20260515000100_create_processing_jobs.sql`.
4. If needed, run `supabase/sql/fix_admin_processing_infrastructure.sql`.
5. Redeploy Vercel if the app still reports a schema cache miss.

Supabase usually refreshes the PostgREST schema cache automatically after DDL. The migration also runs:

```sql
notify pgrst, 'reload schema';
```

## Verify

```sql
select * from public.processing_jobs limit 1;
select * from public.pdf_import_batches limit 1;
select * from public.daily_vocab_generations limit 1;
```

The queries can return zero rows. They should not return “relation does not exist” or “schema cache” errors.
