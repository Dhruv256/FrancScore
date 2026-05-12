-- Replace the email below with the Supabase Auth user that should become admin.
-- The user must sign up once first so public.profiles has a matching row.
update public.profiles
set role = 'ADMIN',
    updated_at = now()
where lower(email) = lower('your-email@example.com');

notify pgrst, 'reload schema';
