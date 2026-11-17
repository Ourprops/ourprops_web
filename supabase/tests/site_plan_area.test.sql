-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin');
-- Kofi's second factor, which staff_role() needs to call him an admin
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now());

-- one plot in review, one verified, both with a boundary drawn by Ama of about 3,000 m²
insert into public.properties (id, prop_id, submitted_by, status, visibility, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'PROP-revw01', '11111111-1111-1111-1111-111111111111', 'under_review', 'unlisted',
   'Plot at Kasoa', 'plot-at-kasoa', 'land', 'Central', 'Kasoa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'PROP-live02', '11111111-1111-1111-1111-111111111111', 'active', 'unlisted',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase');
insert into public.property_boundaries (property_id, source, boundary_polygon) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'manual_draw',
   public.st_geomfromtext('POLYGON((-0.15 5.75, -0.1495 5.75, -0.1495 5.7505, -0.15 5.7505, -0.15 5.75))', 4326)),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'manual_draw',
   public.st_geomfromtext('POLYGON((-0.15 5.76, -0.1495 5.76, -0.1495 5.7605, -0.15 5.7605, -0.15 5.76))', 4326));
insert into public.property_checkpoints (property_id, checkpoint_key, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cadastral_cross_check', 'unverified'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'cadastral_cross_check', 'unverified');

-- what the public sees of the verified plot before any site plan area: the owner's drawing, labelled as such
set local role anon;
select is(
  (select area_source from public.public_property_record('PROP-live02')),
  'owner_map', 'without a checked site plan area, the record says the area is the owner''s drawing');
select ok(
  (select area_sqm between 2500 and 3500 from public.public_property_record('PROP-live02')),
  'and gives that drawing''s area');
reset role;

-- the owner can't set it, directly or through the function
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ update public.properties set site_plan_area_sqm = 99 where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'an owner can''t write the site plan area on their own property');
select throws_ok(
  $$ select public.record_site_plan_area('aaaaaaaa-0000-0000-0000-000000000001', 99) $$,
  '42501', 'Only admins can record the site plan area.', 'nor through the function');

-- the admin, with their second factor
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'cadastral_cross_check', 'verified', null, null) $$,
  '23514', 'Record the area shown on the site plan first.',
  'the survey check can''t be verified before the site plan area is recorded');
select throws_ok(
  $$ select public.record_site_plan_area('aaaaaaaa-0000-0000-0000-000000000001', 0) $$,
  '23514', 'Enter the area shown on the site plan.', 'an area of zero is refused');
select throws_ok(
  $$ select public.record_site_plan_area('aaaaaaaa-0000-0000-0000-000000000002', 1200) $$,
  '23514', 'The site plan area can be changed only while the property is in review.',
  'a verified property''s area can''t be changed without reopening its review');

select lives_ok(
  $$ select public.record_site_plan_area('aaaaaaaa-0000-0000-0000-000000000001', 2800) $$,
  'an admin records the site plan''s area while the property is in review');
select is(
  (select site_plan_area_sqm from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  2800::numeric, 'it is saved, in square metres');
select is(
  (select metadata from public.audit_logs
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'site_plan_area_recorded'),
  '{"old_area_sqm": null, "new_area_sqm": 2800}'::jsonb, 'and logged, with what it was before');
select lives_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'cadastral_cross_check', 'verified', null, null) $$,
  'then the survey check can be verified');
select throws_ok(
  $$ select public.record_site_plan_area('aaaaaaaa-0000-0000-0000-000000000001', null) $$,
  '23514', 'Change the survey records check from verified before clearing the area.',
  'the area can''t be cleared from under a verified survey check');

-- the verified plot, as if its review had recorded 3,000 m² and verified the survey check
reset role;
update public.properties set site_plan_area_sqm = 3000.4 where id = 'aaaaaaaa-0000-0000-0000-000000000002';
set local role anon;
select is(
  (select area_source from public.public_property_record('PROP-live02')),
  'owner_map', 'a recorded area isn''t shown as checked until the survey check is verified');
reset role;
update public.property_checkpoints set status = 'verified'
where property_id = 'aaaaaaaa-0000-0000-0000-000000000002' and checkpoint_key = 'cadastral_cross_check';
set local role anon;
select results_eq(
  $$ select area_sqm, area_source from public.public_property_record('PROP-live02') $$,
  $$ values (3000::numeric, 'site_plan'::text) $$,
  'once it is, the record shows the site plan''s area, rounded, and says so');
reset role;
update public.properties set status = 'suspended', suspension_reason = 'Checking it again' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
set local role anon;
select is(
  (select area_source from public.public_property_record('PROP-live02')),
  'owner_map', 'a suspended property no longer shows the area as checked');
select is((select count(*)::int from public.public_property_record('PROP-revw01')), 0, 'a property in review still has no public record');

select * from finish();
rollback;
