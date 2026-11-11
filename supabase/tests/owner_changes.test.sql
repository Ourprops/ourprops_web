-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

-- Ama owns three plots. Kofi is an admin with a verified authenticator app.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now());

-- all three start as drafts so Ama can save a boundary on the first; then the first two go into review with
-- every checkpoint verified, and the third is only submitted
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'draft',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft',
   'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', 'Adenta', 'inheritance'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'draft',
   'Plot at Aburi', 'plot-at-aburi', 'land', 'Eastern', 'Aburi', 'inheritance');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select public.save_draft_boundary('aaaaaaaa-0000-0000-0000-000000000001',
  '{"type": "Polygon", "coordinates": [[[-0.200, 5.600], [-0.199, 5.600], [-0.199, 5.601], [-0.200, 5.601], [-0.200, 5.600]]]}');
reset role;

update public.properties set status = 'under_review' where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
update public.properties set status = 'submitted' where id = 'aaaaaaaa-0000-0000-0000-000000000003';
insert into public.property_checkpoints (property_id, checkpoint_key, status, verified_by, verified_at)
select property_id, key, 'verified', '22222222-2222-2222-2222-222222222222', now()
from (values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid), ('aaaaaaaa-0000-0000-0000-000000000002'::uuid)) as properties (property_id)
cross join unnest(array['identity_verified', 'ownership_claim_verified', 'boundary_mapped', 'cadastral_cross_check',
                        'overlap_clearance', 'official_search_status', 'encumbrance_clearance']) as key;
-- on the first plot, encumbrance clearance already needs attention
update public.property_checkpoints set status = 'flagged', verified_by = null, verified_at = null, public_notes = 'Needs attention'
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'encumbrance_clearance';

set local role authenticated;

-- Kofi asks for a supporting document on both plots in review
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', 'Please send a receipt.', '[{"slot": "supporting", "note": "A receipt"}]', false) $$,
  'changes are requested on the first plot');
select lives_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000002', 'Please send a receipt.', '[{"slot": "supporting", "note": "A receipt"}]', false) $$,
  'and on the second');

reset role;
select is(
  (select answers_at_request ->> 'name' from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Plot at Oyarifa', 'requesting changes keeps the owner''s answers to compare with later');
set local role authenticated;

-- what the owner can change

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);

update public.properties set name = 'Plot at Oyarifa, east side' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select name from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Plot at Oyarifa, east side', 'the owner changes an answer while changes are asked for');

update public.properties set name = 'Renamed while submitted' where id = 'aaaaaaaa-0000-0000-0000-000000000003';
select is(
  (select name from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'Plot at Aburi', 'the owner can''t change a property that is only submitted');

select throws_ok(
  $$ update public.properties set status = 'under_review' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'the owner can''t change the status themselves');
select throws_ok(
  $$ update public.properties set answers_at_request = null where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'the owner can''t change what their answers are compared with');

select lives_ok(
  $$ select public.save_draft_boundary('aaaaaaaa-0000-0000-0000-000000000001',
       '{"type": "Polygon", "coordinates": [[[-0.200, 5.600], [-0.198, 5.600], [-0.198, 5.601], [-0.200, 5.601], [-0.200, 5.600]]]}') $$,
  'the owner redraws the boundary while changes are asked for');
select throws_ok(
  $$ select public.save_draft_boundary('aaaaaaaa-0000-0000-0000-000000000003',
       '{"type": "Point", "coordinates": [-0.2, 5.6]}') $$,
  'P0002', null, 'the owner can''t change the boundary of a property that is only submitted');

-- the owner uploads the receipt on both plots, and sends them back
insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'supporting',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000001/receipt.pdf', 'receipt.pdf', 1000, 'application/pdf'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'supporting',
   'aaaaaaaa-0000-0000-0000-000000000002/dddddddd-0000-0000-0000-000000000002/receipt.pdf', 'receipt.pdf', 1000, 'application/pdf');
insert into storage.objects (bucket_id, name, owner_id) values
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000001/receipt.pdf', '11111111-1111-1111-1111-111111111111'),
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000002/dddddddd-0000-0000-0000-000000000002/receipt.pdf', '11111111-1111-1111-1111-111111111111');

select lives_ok($$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'the owner sends the changed plot back');
select lives_ok($$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000002') $$,
  'and the unchanged one');

update public.properties set name = 'Renamed after resubmitting' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select name from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Plot at Oyarifa, east side', 'once it is sent back, the owner can''t change it');

-- what resubmitting did

reset role;

select results_eq(
  $$ select metadata -> 'changed_fields' from public.audit_logs
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'property_resubmitted' $$,
  $$ values ('["boundary", "name"]'::jsonb) $$,
  'the audit log names the answers that changed, not their values');

select set_eq(
  $$ select checkpoint_key from public.property_checkpoints
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and status = 'unverified' and verified_by is null $$,
  $$ values ('boundary_mapped'), ('cadastral_cross_check'), ('overlap_clearance'),
            ('ownership_claim_verified'), ('official_search_status') $$,
  'a new boundary and a changed answer reset the checkpoints that depended on them');
select is(
  (select status from public.property_checkpoints
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'identity_verified'),
  'verified', 'identity isn''t reset: owners can''t change it here');
select is(
  (select status from public.property_checkpoints
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'encumbrance_clearance'),
  'flagged', 'a flagged checkpoint stays flagged, rather than looking merely unchecked');
select is(
  (select answers_at_request from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null, 'the comparison is cleared once the property is back in review');

select is(
  (select metadata -> 'changed_fields' from public.audit_logs
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000002' and action = 'property_resubmitted'),
  '[]'::jsonb, 'with nothing changed, the audit log says so');
select is(
  (select count(*)::int from public.property_checkpoints
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000002' and status = 'verified'),
  7, 'and no checkpoint is reset');

-- only an answer changed, on a fresh request: the boundary checkpoints stay as they are

update public.property_checkpoints set status = 'verified', verified_by = '22222222-2222-2222-2222-222222222222', verified_at = now()
where property_id = 'aaaaaaaa-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000002', 'One more receipt.', '[{"slot": "supporting", "note": "Another receipt"}]', false) $$,
  'changes are requested again on the second plot');
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
update public.properties set landmark = 'Behind the school' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type) values
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'supporting',
   'aaaaaaaa-0000-0000-0000-000000000002/dddddddd-0000-0000-0000-000000000003/receipt.pdf', 'receipt.pdf', 1000, 'application/pdf');
insert into storage.objects (bucket_id, name, owner_id) values
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000002/dddddddd-0000-0000-0000-000000000003/receipt.pdf', '11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000002') $$,
  'the owner sends it back with only the landmark changed');
reset role;

select set_eq(
  $$ select checkpoint_key from public.property_checkpoints
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000002' and status = 'unverified' $$,
  $$ values ('ownership_claim_verified'), ('official_search_status'), ('encumbrance_clearance') $$,
  'a changed answer resets exactly the three checkpoints that depend on the answers, not the boundary ones');

-- only the boundary changed: the answer checkpoints stay as they are

update public.property_checkpoints set status = 'verified', verified_by = '22222222-2222-2222-2222-222222222222', verified_at = now()
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and status <> 'flagged';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', 'One more receipt.', '[{"slot": "supporting", "note": "Another receipt"}]', false) $$,
  'changes are requested again on the first plot');
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select public.save_draft_boundary('aaaaaaaa-0000-0000-0000-000000000001',
  '{"type": "Polygon", "coordinates": [[[-0.200, 5.600], [-0.197, 5.600], [-0.197, 5.601], [-0.200, 5.601], [-0.200, 5.600]]]}');
insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type) values
  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'supporting',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000004/receipt.pdf', 'receipt.pdf', 1000, 'application/pdf');
insert into storage.objects (bucket_id, name, owner_id) values
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000004/receipt.pdf', '11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'the owner sends it back with only the boundary changed');
reset role;

select set_eq(
  $$ select checkpoint_key from public.property_checkpoints
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and status = 'unverified' $$,
  $$ values ('boundary_mapped'), ('cadastral_cross_check'), ('overlap_clearance') $$,
  'a new boundary resets exactly the three boundary checkpoints, not the ones that depend on the answers');

select * from finish();
rollback;
