-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- Ama and Yaw are owners, Kofi is an admin with a verified authenticator app
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'yaw@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin'),
  ('33333333-3333-3333-3333-333333333333', 'Yaw Asante', 'owner');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now());

-- Ama's plot is submitted; her draft has no checks
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'submitted',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft',
   'Plot at Aburi', 'plot-at-aburi', 'land', 'Eastern', 'Aburi', 'direct_purchase');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok($$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000001') $$, 'Kofi starts the review, creating the seven checks');
select lives_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'official_search_status', 'flagged',
       'The Lands Commission search shows a caveat on this land.', 'Caveat lodged by a bank in 2019') $$,
  'Kofi flags the Lands Commission search, with a public and an internal note');

-- Ama sees her checks

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*)::int from public.property_checkpoints_for_owner('aaaaaaaa-0000-0000-0000-000000000001')), 7,
  'Ama sees all seven checks on her property');
select results_eq(
  $$ select status, public_notes from public.property_checkpoints_for_owner('aaaaaaaa-0000-0000-0000-000000000001')
     where checkpoint_key = 'official_search_status' $$,
  $$ values ('flagged'::text, 'The Lands Commission search shows a caveat on this land.'::text) $$,
  'with the flag and the note written for her');
select is(
  (select count(*)::int from public.property_checkpoints_for_owner('aaaaaaaa-0000-0000-0000-000000000001') as c
   where c::text like '%2019%' or c::text like '%Kofi%' or c::text like '%2222%'),
  0, 'but never the internal note or who checked it');
select is((select count(*)::int from public.property_checkpoints), 0,
  'reading the checkpoints table directly still gives her nothing: only admins'' policy lets rows through');
select is((select count(*)::int from public.property_checkpoints_for_owner('aaaaaaaa-0000-0000-0000-000000000002')), 0,
  'a draft has no checks to show');

-- she is told about the flag

select results_eq(
  $$ select type, title, body, action_url from public.notifications where type = 'checkpoint.flagged' $$,
  $$ values ('checkpoint.flagged'::text, 'We found something to look into'::text,
             'Lands Commission search, Plot at Oyarifa: The Lands Commission search shows a caveat on this land.'::text,
             '/account/dashboard/properties/aaaaaaaa-0000-0000-0000-000000000001'::text) $$,
  'Ama is told what was found, with a link to her property');

-- Yaw sees nothing of Ama's

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*)::int from public.property_checkpoints_for_owner('aaaaaaaa-0000-0000-0000-000000000001')), 0,
  'another owner gets nothing, not an error');

-- only becoming flagged is news

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'boundary_mapped', 'verified', null, null) $$,
  'Kofi verifies the boundary');
reset role;
select is(
  (select count(*)::int from public.notifications
   where recipient_id = '11111111-1111-1111-1111-111111111111' and type like 'checkpoint.%'),
  1, 'a check being verified doesn''t notify the owner; only the flag did');

select * from finish();
rollback;
