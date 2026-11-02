-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

-- Ama and Yaw are owners, Kofi is an admin with a verified authenticator app.
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

-- Ama's plot is in review with an indenture she uploaded before; her second plot is only submitted
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'under_review',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'submitted',
   'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', 'Adenta', 'inheritance');
-- created yesterday, so they are clearly from before any request made in this test. the blurry site plan is in
-- the same checklist item the admin will ask about again, and its file is in storage.
insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type, created_at) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ownership',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000001/indenture.pdf', 'indenture.pdf', 1000, 'application/pdf',
   now() - interval '1 day'),
  ('dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'site_plan',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000005/blurry.pdf', 'blurry.pdf', 1000, 'application/pdf',
   now() - interval '1 day');
insert into storage.objects (bucket_id, name)
values ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000005/blurry.pdf');

set local role authenticated;

-- who can ask

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', 'Please send', '[{"slot": "site_plan", "note": "Clearer"}]', false) $$,
  '42501', null, 'an owner can''t request changes');

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', 'Please send', '[{"slot": "site_plan", "note": "Clearer"}]', false) $$,
  '42501', null, 'an admin without a second factor can''t request changes');

-- Kofi with a second factor
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000002', 'Please send', '[{"slot": "site_plan", "note": "Clearer"}]', false) $$,
  '23514', 'Changes can be requested only while the property is in review.', 'changes can''t be requested before the review starts');
select throws_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', '  ', '[{"slot": "site_plan", "note": "Clearer"}]', false) $$,
  '23514', 'Write the message the owner will see.', 'a request needs a message for the owner');
select throws_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', 'Please send', '[]', false) $$,
  '23514', 'Ask for at least one document, or for the owner''s identity document.', 'a request has to ask for something');
select throws_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', 'Please send', '[{"slot": "photos", "note": "Clearer"}]', false) $$,
  '23514', 'Each document asked for needs a checklist item and a note.', 'a document has to be for a checklist item');
select throws_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', 'Please send', '[{"slot": "site_plan"}]', false) $$,
  '23514', 'Each document asked for needs a checklist item and a note.', 'each document asked for needs a note');

select lives_ok(
  $$ select public.request_changes('aaaaaaaa-0000-0000-0000-000000000001', 'We need a clearer site plan and your ID.',
       '[{"slot": "site_plan", "note": "The plan you sent is too blurry to read."}]', true) $$,
  'an admin asks for a site plan and the owner''s identity document');

select results_eq(
  $$ select status, changes_requested_message, identity_requested from public.properties
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('action_required'::text, 'We need a clearer site plan and your ID.'::text, true) $$,
  'the property waits on the owner, with the message and the identity request');
select results_eq(
  $$ select slot, note, requested_by, fulfilled_at from public.property_document_requests
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('site_plan'::text, 'The plan you sent is too blurry to read.'::text, '22222222-2222-2222-2222-222222222222'::uuid, null::timestamptz) $$,
  'the request is recorded, open');
select results_eq(
  $$ select metadata -> 'slots', (metadata ->> 'identity')::boolean from public.audit_logs
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'changes_requested' $$,
  $$ values ('["site_plan"]'::jsonb, true) $$,
  'the request is in the audit log');

reset role;
select results_eq(
  $$ select recipient_id, type, body, action_url from public.notifications
     where entity_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid, 'property.changes_requested'::text,
             'We need a clearer site plan and your ID.'::text, '/account/dashboard/properties/aaaaaaaa-0000-0000-0000-000000000001'::text) $$,
  'the owner is told, with the message and a link to the property');
set local role authenticated;

-- what the owner sees and can upload

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "aal": "aal1"}', true);
select is(
  (select count(*)::int from public.property_document_requests where property_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0, 'another owner can''t see the requests');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select is(
  (select note from public.property_document_requests where property_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'The plan you sent is too blurry to read.', 'the owner reads what was asked for');

select throws_ok(
  $$ insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type)
     values ('dddddddd-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ownership',
             'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000009/deed.pdf', 'deed.pdf', 1000, 'application/pdf') $$,
  '42501', null, 'the owner can''t add a document nobody asked for');

select lives_ok(
  $$ insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type)
     values ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'site_plan',
             'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002/plan.pdf', 'plan.pdf', 1000, 'application/pdf') $$,
  'the owner records a document answering the request');
select lives_ok(
  $$ insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type)
     values ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'site_plan',
             'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000003/wrong.pdf', 'wrong.pdf', 1000, 'application/pdf') $$,
  'and a second one, by mistake');

delete from public.property_documents where id = 'dddddddd-0000-0000-0000-000000000003';
delete from public.property_documents where id = 'dddddddd-0000-0000-0000-000000000001';
delete from public.property_documents where id = 'dddddddd-0000-0000-0000-000000000005';
reset role;
select set_eq(
  $$ select id from public.property_documents where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('dddddddd-0000-0000-0000-000000000001'::uuid), ('dddddddd-0000-0000-0000-000000000002'::uuid),
            ('dddddddd-0000-0000-0000-000000000005'::uuid) $$,
  'the owner can take back a document answering the request, but not one from before it, even in the same item');
set local role authenticated;

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000005/replaced.pdf',
             '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'the owner can''t put a file anywhere but where a requested document was recorded');

select throws_ok(
  $$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'Add your identity document first.', 'the property can''t go back without the identity document asked for');

reset role;
insert into public.identity_documents (profile_id, document_type, issuing_country, document_number, expires_on, file_path)
values ('11111111-1111-1111-1111-111111111111', 'ghana_card', 'GH', 'GHA-123456789-0', current_date + 365,
        '11111111-1111-1111-1111-111111111111/card.jpg');
set local role authenticated;

select throws_ok(
  $$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'Upload the document we asked for first.',
  'a recorded document whose file never arrived doesn''t count, nor does the old site plan already in storage');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002/plan.pdf',
             '11111111-1111-1111-1111-111111111111') $$,
  'the owner uploads the file where the requested document was recorded');

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0002', null, 'another owner can''t send the property back, and it looks as if it doesn''t exist');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select lives_ok(
  $$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'the owner sends the property back');

select results_eq(
  $$ select status, changes_requested_message, identity_requested from public.properties
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('under_review'::text, null::text, false) $$,
  'it is back in review, with the request cleared');
select results_eq(
  $$ select fulfilled_by_document_id, fulfilled_at is not null from public.property_document_requests
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('dddddddd-0000-0000-0000-000000000002'::uuid, true) $$,
  'the request is fulfilled by the document whose file arrived');
select throws_ok(
  $$ insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type)
     values ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'site_plan',
             'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000004/late.pdf', 'late.pdf', 1000, 'application/pdf') $$,
  '42501', null, 'once it is sent back, the owner can''t add documents');
select throws_ok(
  $$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property isn''t waiting on anything from you.', 'it can''t be sent back twice');

reset role;
select results_eq(
  $$ select actor_id, metadata -> 'document_ids' from public.audit_logs
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'property_resubmitted' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid, '["dddddddd-0000-0000-0000-000000000002"]'::jsonb) $$,
  'the audit log records who sent it back and which documents answered');

-- an open request blocks approval; resubmitting leaves none, so one is opened by hand
insert into public.property_document_requests (property_id, slot, note, requested_by)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'supporting', 'A receipt', '22222222-2222-2222-2222-222222222222');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select ok(
  'A document asked for from the owner hasn''t arrived.' in (select public.approval_blockers('aaaaaaaa-0000-0000-0000-000000000001')),
  'an open request blocks approval');

-- signed out

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok(
  $$ select public.resubmit_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'signed-out users can''t call resubmit_property');
select throws_ok(
  $$ select * from public.property_document_requests $$,
  '42501', null, 'signed-out users can''t read requests');

reset role;

select * from finish();
rollback;
