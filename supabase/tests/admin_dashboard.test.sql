-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- the dashboard counts the whole database, so these check what the fixture adds, not exact totals.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now());

-- one verified plot with a boundary, and one draft with a boundary that must never be placed on the map
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'active',
   'Dashboard plot', 'dashboard-plot', 'land', 'Volta', 'Ho', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft',
   'Secret draft', 'secret-draft', 'land', 'Volta', 'Ho', 'direct_purchase');
insert into public.property_boundaries (property_id, source, boundary_polygon) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'manual_draw',
   public.st_geomfromtext('POLYGON((0.47 6.6, 0.4705 6.6, 0.4705 6.6005, 0.47 6.6005, 0.47 6.6))', 4326)),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'manual_draw',
   public.st_geomfromtext('POLYGON((0.48 6.6, 0.4805 6.6, 0.4805 6.6005, 0.48 6.6005, 0.48 6.6))', 4326));

set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$ select public.admin_dashboard() $$, '42501', null, 'an owner can''t see the dashboard');

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok($$ select public.admin_dashboard() $$, '42501', null, 'nor can an admin without a second factor');

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

select ok(
  exists (select 1 from jsonb_array_elements(public.admin_dashboard() -> 'points') as point
          where point ->> 'name' = 'Dashboard plot'
            and (point ->> 'lat')::numeric between 6.6 and 6.601 and (point ->> 'lng')::numeric between 0.47 and 0.471),
  'a verified property is on the map at the centre of its boundary');
select is(
  (select count(*)::int from jsonb_array_elements(public.admin_dashboard() -> 'points') as point where point ->> 'name' = 'Secret draft'),
  0, 'a draft is never placed on the map');
select ok(
  (public.admin_dashboard() -> 'properties' ->> 'draft')::int >= 1,
  'but drafts are counted');
select ok(
  exists (select 1 from jsonb_array_elements(public.admin_dashboard() -> 'regions') as region
          where region ->> 'region' = 'Volta' and (region ->> 'verified')::int >= 1),
  'the region counts its verified property');
select is(jsonb_array_length(public.admin_dashboard() -> 'weekly'), 12, 'the trend covers twelve weeks');

select * from finish();
rollback;
