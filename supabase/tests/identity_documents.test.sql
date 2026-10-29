-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- two users, each with a photo already uploaded to their own folder
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test');
insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng');
insert into storage.objects (bucket_id, name) values
  ('identity-documents', '11111111-1111-1111-1111-111111111111/card.jpg'),
  ('identity-documents', '22222222-2222-2222-2222-222222222222/passport.jpg');

-- act as Ama
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select lives_ok(
  $$ select public.save_identity_document('ghana_card', null, ' gha-123456789-0 ', current_date + 365,
       '11111111-1111-1111-1111-111111111111/card.jpg') $$,
  'a user can save a Ghana Card with a photo in their own folder'
);

select is(
  (select document_number || '|' || issuing_country || '|' || verification_status from public.identity_documents),
  'GHA-123456789-0|GH|unreviewed',
  'the number is stored in capitals without spaces, a Ghana Card is issued by Ghana, and it waits for review'
);

select throws_ok(
  $$ select public.save_identity_document('passport', 'gb', '123456789', current_date,
       '11111111-1111-1111-1111-111111111111/card.jpg') $$,
  '23514', null,
  'an expired document is refused'
);

select throws_ok(
  $$ select public.save_identity_document('passport', 'GB', '123456789', current_date + 365,
       '22222222-2222-2222-2222-222222222222/passport.jpg') $$,
  'P0002', null,
  'a file in another user''s folder is refused'
);

select throws_ok(
  $$ update public.identity_documents set verification_status = 'verified' $$,
  '42501', null,
  'a user can''t mark their own document verified by writing the table'
);

-- act as Kofi
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);

select is(
  (select count(*) from public.identity_documents),
  0::bigint,
  'a user can''t see another user''s document'
);

select throws_ok(
  $$ select public.save_identity_document('ghana_card', null, 'GHA-123456789-0', current_date + 365,
       '22222222-2222-2222-2222-222222222222/passport.jpg') $$,
  '23505', null,
  'one document can''t be linked to two accounts'
);

select lives_ok(
  $$ select public.save_identity_document('passport', 'gb', '987654321', current_date + 365,
       '22222222-2222-2222-2222-222222222222/passport.jpg') $$,
  'a user abroad can save a passport instead'
);

-- back to the database owner to check the audit log and verify Ama's document
reset role;

select is(
  (select count(*) from public.audit_logs
   where action = 'identity_document_saved' and metadata::text like '%123456789%'),
  0::bigint,
  'document numbers never reach the audit log'
);

update public.identity_documents
  set verification_status = 'verified', verified_at = now()
  where profile_id = '11111111-1111-1111-1111-111111111111';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select throws_ok(
  $$ select public.save_identity_document('ghana_card', null, 'GHA-999999999-9', current_date + 365,
       '11111111-1111-1111-1111-111111111111/card.jpg') $$,
  '23514', null,
  'a verified document can''t be replaced by its owner'
);

-- signed-out visitors can't call the function at all
reset role;
set local role anon;

select throws_ok(
  $$ select public.save_identity_document('ghana_card', null, 'GHA-111111111-1', current_date + 365, 'x/y.jpg') $$,
  '42501', null,
  'signed-out visitors can''t save a document'
);

select * from finish();
rollback;
