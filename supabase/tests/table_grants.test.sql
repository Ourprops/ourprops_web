-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- every privilege anon or authenticated still holds on the tables that should be closed to them
create temporary table leftover_privileges as
select tables.name as table_name, roles.name as role_name, privileges.name as privilege
from unnest(array['audit_logs', 'data_room_access_requests', 'notifications', 'property_checkpoints',
                  'property_co_owners', 'property_images', 'property_overlap_flags']) as tables(name)
cross join unnest(array['anon', 'authenticated']) as roles(name)
cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as privileges(name)
where has_table_privilege(roles.name, 'public.' || tables.name, privileges.name)
   or (privileges.name in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
       and has_any_column_privilege(roles.name, 'public.' || tables.name, privileges.name));

select is_empty(
  $$ select * from leftover_privileges $$,
  'anon and authenticated hold no privileges on the review, audit and other unused tables'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT')
  and not has_any_column_privilege('anon', 'public.profiles', 'SELECT,INSERT,UPDATE,REFERENCES')
  and not has_table_privilege('anon', 'public.profiles', 'DELETE,TRUNCATE,TRIGGER'),
  'signed-out users hold no privileges on profiles'
);

select ok(
  not has_any_column_privilege('authenticated', 'public.profiles', 'INSERT'),
  'signed-in users can''t insert profiles, so no insert policy could let them create an admin profile'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'DELETE,TRUNCATE'),
  'signed-in users can''t delete or truncate profiles'
);

select ok(
  has_table_privilege('authenticated', 'public.profiles', 'SELECT')
  and has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE'),
  'signed-in users can still read and edit their profile, as onboarding needs'
);

-- the overlap trigger writes property_overlap_flags. users can't write that table any more, so check the
-- trigger still runs when a user saves a boundary through save_draft_boundary.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test');
insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng');
insert into public.properties (id, submitted_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222');

set local role authenticated;

-- Ama's plot, about 110 m across, in Accra
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.save_draft_boundary(
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       '{"type": "Polygon", "coordinates": [[[-0.200, 5.600], [-0.199, 5.600], [-0.199, 5.601], [-0.200, 5.601], [-0.200, 5.600]]]}'
     ) $$,
  'a user can still save a boundary'
);

-- Kofi's plot covers half of Ama's
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.save_draft_boundary(
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
       '{"type": "Polygon", "coordinates": [[[-0.1995, 5.600], [-0.1985, 5.600], [-0.1985, 5.601], [-0.1995, 5.601], [-0.1995, 5.600]]]}'
     ) $$,
  'a user can still save a boundary that overlaps another property'
);

select throws_ok(
  $$ select count(*) from public.property_overlap_flags $$,
  '42501', null,
  'users can''t read overlap flags, which would reveal whose land overlaps theirs'
);

reset role;

select is(
  (select count(*) from public.property_overlap_flags
   where property_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     and conflicting_property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'the overlap trigger still records the overlap'
);

select * from finish();
rollback;
