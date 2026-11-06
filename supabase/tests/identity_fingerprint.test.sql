-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Ama and Yaw are owners, Kofi is an admin with a verified authenticator app. each owner has a photo uploaded.
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
insert into storage.objects (bucket_id, name) values
  ('identity-documents', '11111111-1111-1111-1111-111111111111/card.jpg'),
  ('identity-documents', '33333333-3333-3333-3333-333333333333/card.jpg');

set local role authenticated;

-- Ama saves her Ghana Card

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select lives_ok(
  $$ select public.save_identity_document('ghana_card', null, 'GHA-123456789-0', current_date + 365,
       '11111111-1111-1111-1111-111111111111/card.jpg') $$,
  'Ama saves her Ghana Card');

reset role;

select matches(
  (select document_number_hmac from public.identity_documents where profile_id = '11111111-1111-1111-1111-111111111111'),
  '^[0-9a-f]{64}$',
  'the number''s fingerprint is stored as 64 hex characters');
select isnt(
  (select document_number_hmac from public.identity_documents where profile_id = '11111111-1111-1111-1111-111111111111'),
  encode(extensions.digest('ghana_card:GH:GHA-123456789-0', 'sha256'), 'hex'),
  'the fingerprint is keyed, not a plain hash anyone could recompute');

-- nobody but the database can make fingerprints or read the key

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

select is(
  (select count(*)::int from public.identity_documents where profile_id = '11111111-1111-1111-1111-111111111111'),
  1, 'the admin can read Ama''s document, fingerprint included');
select throws_ok(
  $$ select public.identity_number_fingerprint('ghana_card', 'GH', 'GHA-123456789-0') $$,
  '42501', null, 'an admin can''t make fingerprints to match numbers against the table');
select throws_ok(
  $$ select decrypted_secret from vault.decrypted_secrets $$,
  '42501', null, 'a signed-in user can''t read the key');

-- the number and the photo stay until the document is verified

reset role;

select throws_ok(
  $$ update public.identity_documents set document_number = null, file_path = null
     where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'a document waiting for review keeps its number and photo');

-- what review_identity_document will do: verify, then clear the number and the photo
select lives_ok(
  $$ update public.identity_documents
     set verification_status = 'verified', verified_at = now(), document_number = null, file_path = null
     where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  'a verified document''s number and photo can be cleared');
select results_eq(
  $$ select document_number, file_path, document_number_hmac ~ '^[0-9a-f]{64}$' from public.identity_documents
     where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values (null::text, null::text, true) $$,
  'the fingerprint outlives the number');

-- Yaw tries the same card, typed differently

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.save_identity_document('ghana_card', null, ' gha-123456789-0', current_date + 365,
       '33333333-3333-3333-3333-333333333333/card.jpg') $$,
  '23505', 'This document is already linked to another account. Contact us if it is yours.',
  'a verified card still can''t be linked to a second account once its number is gone');
select lives_ok(
  $$ select public.save_identity_document('passport', 'gh', 'GHA-123456789-0', current_date + 365,
       '33333333-3333-3333-3333-333333333333/card.jpg') $$,
  'the same characters on a different kind of document are a different document');

reset role;

select is(
  (select count(*)::int from public.audit_logs
   where action = 'identity_document_saved'
     and actor_id in ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')
     and (metadata::text like '%123456789%'
          or metadata::text ~ (select document_number_hmac from public.identity_documents
                               where profile_id = '11111111-1111-1111-1111-111111111111'))),
  0, 'neither numbers nor fingerprints reach the audit log');

select * from finish();
rollback;
