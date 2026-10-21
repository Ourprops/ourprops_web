-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- an owner and an admin. the role is set here, as superuser, because users can't make themselves admins.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin');

set local role authenticated;

-- Ama, an owner, signed in with a second factor
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);
select is(public.staff_role(), null, 'an owner has no staff role, even with a second factor');

-- Kofi, an admin, signed in with a password only
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select is(public.staff_role(), null, 'an admin signed in with only a password has no staff role');

-- Kofi with no aal claim at all
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select is(public.staff_role(), null, 'a session without an aal claim has no staff role');

-- Kofi signed in with a second factor
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select is(public.staff_role(), 'admin', 'an admin signed in with a second factor is an admin');

-- signed out
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok(
  $$ select public.staff_role() $$,
  '42501', null,
  'signed-out users can''t call staff_role'
);

reset role;

select ok(
  not has_function_privilege('public', 'public.staff_role()', 'EXECUTE'),
  'execute isn''t granted to public, so new roles don''t get it by default'
);

select * from finish();
rollback;
