-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- Ama owns the Ghana Card GHA-123456789-0, but Yaw's account holds it, verified. Efua's passport waits for review.
-- Kofi is an admin with a verified authenticator app.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'yaw@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'efua@example.test');
insert into public.profiles (id, full_name, role, phone_number) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner', '+233200000001'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin', '+233200000002'),
  ('33333333-3333-3333-3333-333333333333', 'Yaw Asante', 'owner', '+233200000003'),
  ('44444444-4444-4444-4444-444444444444', 'Efua Owusu', 'owner', '+233200000004');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now());

insert into public.identity_documents (profile_id, document_type, issuing_country, document_number, expires_on, file_path) values
  ('33333333-3333-3333-3333-333333333333', 'ghana_card', 'GH', 'GHA-123456789-0', current_date + 365,
   '33333333-3333-3333-3333-333333333333/card.jpg'),
  ('44444444-4444-4444-4444-444444444444', 'passport', 'GB', '987654321', current_date + 365,
   '44444444-4444-4444-4444-444444444444/passport.jpg');
-- Yaw's was verified, so its number and photo are gone
update public.identity_documents
  set verification_status = 'verified', verified_at = now(), document_number = null, file_path = null
  where profile_id = '33333333-3333-3333-3333-333333333333';
insert into storage.objects (bucket_id, name) values
  ('identity-documents', '11111111-1111-1111-1111-111111111111/card.jpg'),
  ('identity-documents', '44444444-4444-4444-4444-444444444444/passport.jpg');

-- Yaw has an active property and a submitted one; Efua has an active one
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'active',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'submitted',
   'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', 'Adenta', 'inheritance'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'active',
   'Plot at Kasoa', 'plot-at-kasoa', 'land', 'Central', 'Kasoa', 'direct_purchase');
insert into public.property_checkpoints (property_id, checkpoint_key, status, verified_by, verified_at, public_notes) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'identity_verified', 'verified', '22222222-2222-2222-2222-222222222222', now(), 'Checked'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'boundary_mapped', 'verified', '22222222-2222-2222-2222-222222222222', now(), null),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'identity_verified', 'verified', '22222222-2222-2222-2222-222222222222', now(), null);

set local role authenticated;

-- who can look up and release

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
  $$ select * from public.find_identity_document_holder('ghana_card', null, 'GHA-123456789-0') $$,
  '42501', null, 'an owner can''t find who holds a number');
select throws_ok(
  $$ select public.release_identity_document('33333333-3333-3333-3333-333333333333', 'It is mine') $$,
  '42501', null, 'an owner can''t release someone else''s document');

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select * from public.find_identity_document_holder('ghana_card', null, 'GHA-123456789-0') $$,
  '42501', null, 'an admin without a second factor can''t look up a number');

-- Kofi with a second factor finds the holder

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok(
  $$ select * from public.find_identity_document_holder('driving_licence', 'GH', '123') $$,
  '23514', 'Choose a Ghana Card or a passport.', 'only the two kinds of document can be looked up');
select results_eq(
  $$ select profile_id, full_name, email, phone_number, verification_status
     from public.find_identity_document_holder('ghana_card', 'XX', ' gha-123456789-0 ') $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::uuid, 'Yaw Asante'::text, 'yaw@example.test'::text,
             '+233200000003'::text, 'verified'::text) $$,
  'the holder of a verified card is found by its number, typed as the owner typed it, though the number is gone');
select is(
  (select count(*)::int from public.find_identity_document_holder('ghana_card', null, 'GHA-000000000-0')),
  0, 'a number nobody holds finds nobody');

-- releasing Yaw's verified card

select throws_ok(
  $$ select public.release_identity_document('33333333-3333-3333-3333-333333333333', '  ') $$,
  '23514', null, 'a release needs a reason');
select throws_ok(
  $$ select public.release_identity_document('99999999-9999-9999-9999-999999999999', 'Proved on a call') $$,
  'P0002', 'Identity document not found.', 'releasing a missing document is refused');
select is(
  public.release_identity_document('33333333-3333-3333-3333-333333333333', 'Ama showed the card on a video call'),
  null, 'Yaw''s verified card is released, with no photo left to delete');

reset role;

select is(
  (select count(*)::int from public.identity_documents where profile_id = '33333333-3333-3333-3333-333333333333'),
  0, 'Yaw no longer holds the card');
select results_eq(
  $$ select id, status from public.properties where submitted_by = '33333333-3333-3333-3333-333333333333' order by id $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'under_review'::text),
            ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'submitted'::text) $$,
  'Yaw''s active property goes back to review; the one not yet approved stays where it was');
select results_eq(
  $$ select status, verified_by, public_notes from public.property_checkpoints
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'identity_verified' $$,
  $$ values ('unverified'::text, null::uuid, null::text) $$,
  'its identity checkpoint is unverified again, with nobody''s verification left on it');
select is(
  (select status from public.property_checkpoints
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'boundary_mapped'),
  'verified', 'the other checkpoints are left as they were');
select results_eq(
  $$ select property_id, metadata -> 'checkpoints', metadata ->> 'note' from public.audit_logs
     where action = 'review_reopened' and actor_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, '["identity_verified"]'::jsonb,
             'Identity document released: Ama showed the card on a video call'::text) $$,
  'the property''s history says why it went back to review');
select results_eq(
  $$ select metadata ->> 'profile_id', (metadata ->> 'was_verified')::boolean, metadata ->> 'reason' from public.audit_logs
     where action = 'identity_document_released' and actor_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::text, true, 'Ama showed the card on a video call'::text) $$,
  'the release is audited with its reason');
select results_eq(
  $$ select metadata ->> 'found_profile_id' from public.audit_logs
     where action = 'identity_document_looked_up' and actor_id = '22222222-2222-2222-2222-222222222222'
     order by metadata ->> 'found_profile_id' nulls last $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::text), (null::text) $$,
  'every lookup is audited, including one that found nobody');
select is(
  (select count(*)::int from public.audit_logs
   where actor_id = '22222222-2222-2222-2222-222222222222' and metadata::text like '%123456789%'),
  0, 'no number reaches the audit log, from a lookup or a release');

-- Ama can now save her card

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.save_identity_document('ghana_card', null, 'GHA-123456789-0', current_date + 365,
       '11111111-1111-1111-1111-111111111111/card.jpg') $$,
  'once released, the card''s rightful owner can save it');

-- releasing Efua's passport, which waits for review

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select is(
  public.release_identity_document('44444444-4444-4444-4444-444444444444', 'Duplicate account'),
  '44444444-4444-4444-4444-444444444444/passport.jpg',
  'a document waiting for review is released, and its photo''s path comes back for deletion');

reset role;

select is(
  (select status from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'active', 'releasing a document that was never verified leaves the account''s properties alone');
select is(
  (select status from public.property_checkpoints
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000003' and checkpoint_key = 'identity_verified'),
  'verified', 'and its checkpoints too');
select is(
  (select (metadata ->> 'was_verified')::boolean from public.audit_logs
   where action = 'identity_document_released' and metadata ->> 'profile_id' = '44444444-4444-4444-4444-444444444444'),
  false, 'the audit log says it wasn''t verified');

select * from finish();
rollback;
