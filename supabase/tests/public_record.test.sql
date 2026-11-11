-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin');

-- Ama's plots: one verified, one suspended, one in review, one draft, and one verified but kept private
insert into public.properties (id, prop_id, submitted_by, status, suspension_reason, visibility, name, slug, property_type, region,
                               district_municipality, city_town, address, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'PROP-live01', '11111111-1111-1111-1111-111111111111', 'active', null, 'unlisted',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Adenta Municipal', 'Oyarifa', '12 Palm Lane', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'PROP-paus02', '11111111-1111-1111-1111-111111111111', 'suspended', 'Verification expired',
   'unlisted', 'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', null, 'Adenta', null, 'inheritance'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'PROP-revw03', '11111111-1111-1111-1111-111111111111', 'under_review', null, 'unlisted',
   'Plot at Kasoa', 'plot-at-kasoa', 'land', 'Central', null, 'Kasoa', null, 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'PROP-priv05', '11111111-1111-1111-1111-111111111111', 'active', null, 'private',
   'Plot at Tema', 'plot-at-tema', 'land', 'Greater Accra', null, 'Tema', null, 'direct_purchase');
insert into public.properties (id, prop_id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000004', 'PROP-draf04', '11111111-1111-1111-1111-111111111111', 'draft',
   'Plot at Aburi', 'plot-at-aburi', 'land', 'Eastern', 'Aburi', 'direct_purchase');

insert into public.property_boundaries (property_id, source, boundary_polygon) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'manual_draw',
   public.st_geomfromtext('POLYGON((-0.15 5.75, -0.1495 5.75, -0.1495 5.7505, -0.15 5.7505, -0.15 5.75))', 4326));

insert into public.property_checkpoints (property_id, checkpoint_key, status, public_notes, internal_notes, verified_by, verified_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'identity_verified', 'verified', null, 'Matched on a call', '22222222-2222-2222-2222-222222222222', now()),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'official_search_status', 'waived', 'No search on file yet', 'Owner abroad',
   '22222222-2222-2222-2222-222222222222', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'identity_verified', 'verified', null, null, '22222222-2222-2222-2222-222222222222', now());
insert into public.audit_logs (actor_id, property_id, action) values
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', 'property_approved');

-- a visitor who isn't signed in
set local role anon;

select results_eq(
  $$ select prop_id, name, property_type, city_town, district_municipality, region, status
     from public.public_property_record('PROP-live01') $$,
  $$ values ('PROP-live01'::text, 'Plot at Oyarifa'::text, 'land'::text, 'Oyarifa'::text, 'Adenta Municipal'::text,
             'Greater Accra'::text, 'active'::text) $$,
  'anyone with the link sees a verified property: what it is and roughly where');
select ok(
  (select area_sqm between 2500 and 3500 and area_sqm = round(area_sqm) from public.public_property_record('PROP-live01')),
  'its size comes from the mapped boundary, rounded to a whole square metre');
select isnt((select verified_at from public.public_property_record('PROP-live01')), null, 'and when it was verified');
select is(
  (select checkpoints from public.public_property_record('PROP-live01')),
  '[{"key": "identity_verified", "note": null, "status": "verified"},
    {"key": "official_search_status", "note": "No search on file yet", "status": "waived"}]'::jsonb,
  'what was checked, with the public note, never the internal one');
select is(
  (select record::text like '%Palm Lane%' from public.public_property_record('PROP-live01') as record),
  false, 'the exact address isn''t part of the record');
select is(
  (select record::text like '%Ama%' or record::text like '%Kofi%' or record::text like '%Matched%'
   from public.public_property_record('PROP-live01') as record),
  false, 'neither the owner, the admin, nor an internal note is in it');

select results_eq(
  $$ select status, verified_at, checkpoints from public.public_property_record('PROP-paus02') $$,
  $$ values ('suspended'::text, null::timestamptz, null::jsonb) $$,
  'a suspended property says only that it isn''t currently verified');
select is((select count(*)::int from public.public_property_record('PROP-revw03')), 0, 'a property still in review has no record');
select is((select count(*)::int from public.public_property_record('PROP-draf04')), 0, 'nor does a draft');
select is((select count(*)::int from public.public_property_record('PROP-priv05')), 0, 'nor a verified property kept private');
select is((select count(*)::int from public.public_property_record('PROP-nope99')), 0, 'an unknown reference finds nothing');
select throws_ok($$ select * from public.properties $$, '42501', null, 'a visitor still can''t read the properties table itself');

-- submitting a property tells its owner we have it

reset role;
update public.properties set status = 'submitted' where id = 'aaaaaaaa-0000-0000-0000-000000000004';
select results_eq(
  $$ select type, title, body from public.notifications where entity_id = 'aaaaaaaa-0000-0000-0000-000000000004' $$,
  $$ values ('property.submitted'::text, 'We''ve received your property'::text,
             'Plot at Aburi is with us, reference PROP-draf04. We''ll start checking it soon.'::text) $$,
  'the owner is told their property has arrived, with its reference');
update public.properties set status = 'under_review' where id = 'aaaaaaaa-0000-0000-0000-000000000004';
select is(
  (select count(*)::int from public.notifications where entity_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  2, 'and, as before, when we start checking it');

select * from finish();
rollback;
