-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- Ama, Yaw and Efua are owners, Kofi is an admin with a verified authenticator app.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'yaw@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'efua@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin'),
  ('33333333-3333-3333-3333-333333333333', 'Yaw Asante', 'owner'),
  ('44444444-4444-4444-4444-444444444444', 'Efua Owusu', 'owner');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now());

-- Ama and Efua have properties in review; Yaw has only a draft
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'under_review',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'draft',
   'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', 'Adenta', 'inheritance'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'under_review',
   'Plot at Kasoa', 'plot-at-kasoa', 'land', 'Central', 'Kasoa', 'direct_purchase');

-- each has a document waiting for review, with its photo in storage. Efua's has expired since she saved it.
insert into public.identity_documents (profile_id, document_type, issuing_country, document_number, expires_on, file_path) values
  ('11111111-1111-1111-1111-111111111111', 'ghana_card', 'GH', 'GHA-123456789-0', current_date + 365,
   '11111111-1111-1111-1111-111111111111/card.jpg'),
  ('33333333-3333-3333-3333-333333333333', 'passport', 'GB', '123456789', current_date + 365,
   '33333333-3333-3333-3333-333333333333/passport.jpg'),
  ('44444444-4444-4444-4444-444444444444', 'ghana_card', 'GH', 'GHA-987654321-0', current_date - 1,
   '44444444-4444-4444-4444-444444444444/card.jpg');
insert into storage.objects (bucket_id, name, metadata) values
  ('identity-documents', '11111111-1111-1111-1111-111111111111/card.jpg', '{"mimetype": "image/jpeg"}'),
  ('identity-documents', '33333333-3333-3333-3333-333333333333/passport.jpg', '{"mimetype": "image/jpeg"}'),
  ('identity-documents', '44444444-4444-4444-4444-444444444444/card.jpg', '{"mimetype": "text/html"}');

set local role authenticated;

-- who can review

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
  $$ select public.review_identity_document('11111111-1111-1111-1111-111111111111', 'verified', null) $$,
  '42501', null, 'an owner can''t verify their own document');
select throws_ok(
  $$ select public.forget_identity_photo('11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'an owner can''t call the photo cleanup');

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.review_identity_document('11111111-1111-1111-1111-111111111111', 'verified', null) $$,
  '42501', null, 'an admin without a second factor can''t review');

-- Kofi with a second factor
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok(
  $$ select public.review_identity_document('11111111-1111-1111-1111-111111111111', 'unreviewed', null) $$,
  '23514', 'Choose verified or rejected.', 'only verified or rejected can be chosen');
select throws_ok(
  $$ select public.review_identity_document('11111111-1111-1111-1111-111111111111', 'rejected', '  ') $$,
  '23514', 'Say why, so the owner knows what to send instead.', 'a rejection needs a note for the owner');
select throws_ok(
  $$ select public.review_identity_document('99999999-9999-9999-9999-999999999999', 'verified', null) $$,
  'P0002', 'Identity document not found.', 'a missing document is not found');
select throws_ok(
  $$ select public.review_identity_document('44444444-4444-4444-4444-444444444444', 'verified', null) $$,
  '23514', null, 'an expired document can''t be verified');

-- which photos the admin can see

select is(
  (select count(*)::int from storage.objects where name = '11111111-1111-1111-1111-111111111111/card.jpg'),
  1, 'the admin can see the photo of an owner whose property is in review');
select is(
  (select count(*)::int from storage.objects where name = '33333333-3333-3333-3333-333333333333/passport.jpg'),
  0, 'the admin can''t see the photo of an owner who has only a draft');
select is(
  (select count(*)::int from storage.objects where name = '44444444-4444-4444-4444-444444444444/card.jpg'),
  0, 'the admin can''t see a photo stored as something a browser shouldn''t open');

-- the Storage API deletes with this set; the policies still decide which rows it may delete
set local storage.allow_delete_query = 'true';

select results_eq(
  $$ with deleted as (delete from storage.objects where name = '11111111-1111-1111-1111-111111111111/card.jpg' returning 1)
     select count(*)::int from deleted $$,
  $$ values (0) $$,
  'the admin can''t delete a photo still waiting for review');
select throws_ok(
  $$ select public.forget_identity_photo('11111111-1111-1111-1111-111111111111') $$,
  'P0002', 'There is no verified photo to delete.', 'nothing is forgotten before the document is verified');

-- Kofi verifies Ama's card

select lives_ok(
  $$ select public.review_identity_document('11111111-1111-1111-1111-111111111111', 'verified', ' Name matches the indenture. ') $$,
  'the admin verifies Ama''s card');
select results_eq(
  $$ select verification_status, document_number, file_path, document_number_hmac ~ '^[0-9a-f]{64}$', verified_by, review_note
     from public.identity_documents where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('verified'::text, null::text, '11111111-1111-1111-1111-111111111111/card.jpg'::text, true,
             '22222222-2222-2222-2222-222222222222'::uuid, 'Name matches the indenture.'::text) $$,
  'verifying clears the number at once, keeps the fingerprint, and lists the photo until it is deleted');
select throws_ok(
  $$ select public.review_identity_document('11111111-1111-1111-1111-111111111111', 'rejected', 'Second thoughts') $$,
  '23514', 'This identity document has already been reviewed.', 'a reviewed document can''t be reviewed again');
select is(
  (select count(*)::int from storage.objects where name = '11111111-1111-1111-1111-111111111111/card.jpg'),
  1, 'the verified photo stays visible to the admin until it is deleted, as a delete needs to see the row');
select throws_ok(
  $$ select public.forget_identity_photo('11111111-1111-1111-1111-111111111111') $$,
  '23514', 'The photo is still in storage. Try again.', 'the photo isn''t forgotten while it is still in storage');

-- the server action deletes the photo through the Storage API, then calls forget_identity_photo
select results_eq(
  $$ with deleted as (delete from storage.objects where bucket_id = 'identity-documents' returning name)
     select string_agg(name, ',') from deleted $$,
  $$ values ('11111111-1111-1111-1111-111111111111/card.jpg'::text) $$,
  'the admin can delete the verified photo, and no other');
select lives_ok(
  $$ select public.forget_identity_photo('11111111-1111-1111-1111-111111111111') $$,
  'once the file is gone, the photo is forgotten');
select is(
  (select file_path from public.identity_documents where profile_id = '11111111-1111-1111-1111-111111111111'),
  null, 'nothing is left of the number or the photo');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'identity-documents'
     and name like '11111111-1111-1111-1111-111111111111/%'),
  0, 'the admin has no photo of Ama left to see');
select throws_ok(
  $$ select public.forget_identity_photo('11111111-1111-1111-1111-111111111111') $$,
  'P0002', 'There is no verified photo to delete.', 'forgetting twice is refused');

-- rejecting Yaw's passport

select lives_ok(
  $$ select public.review_identity_document('33333333-3333-3333-3333-333333333333', 'rejected', 'The photo is blurred. Take it again in good light.') $$,
  'the admin rejects Yaw''s passport with a note');
select results_eq(
  $$ select verification_status, document_number, file_path, review_note, verified_by
     from public.identity_documents where profile_id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values ('rejected'::text, '123456789'::text, '33333333-3333-3333-3333-333333333333/passport.jpg'::text,
             'The photo is blurred. Take it again in good light.'::text, null::uuid) $$,
  'a rejected document keeps its number and photo until the owner replaces it, and carries the note');

-- what the database holds afterwards

reset role;

select throws_ok(
  $$ update public.identity_documents set document_number = 'GHA-123456789-0'
     where profile_id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'a verified document can never get its number back');
select results_eq(
  $$ select action, metadata ->> 'verification_status' from public.audit_logs
     where actor_id = '22222222-2222-2222-2222-222222222222' and action like 'identity_%'
     order by action, metadata ->> 'verification_status' $$,
  $$ values ('identity_document_reviewed'::text, 'rejected'::text),
            ('identity_document_reviewed'::text, 'verified'::text),
            ('identity_photo_deleted'::text, null::text) $$,
  'each review and the photo''s deletion are audited');
select is(
  (select count(*)::int from public.audit_logs
   where actor_id = '22222222-2222-2222-2222-222222222222'
     and (metadata::text like '%123456789%' or metadata::text like '%card.jpg%')),
  0, 'the audit log holds neither the number nor the photo''s path');

select * from finish();
rollback;
