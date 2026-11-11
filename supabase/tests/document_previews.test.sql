-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(28);

-- Ama is an owner, Kofi is an admin with a verified authenticator app.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now());

-- Ama's first plot is in review, her second is still a draft
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'under_review',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft',
   'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', 'Adenta', 'inheritance');

-- in review: a PDF, a Word file, a TIFF scan, a "PDF" whose file was stored as a Word document, and a HEIC photo
-- uploaded before HEIC stopped being taken.
-- in the draft: a PDF.
insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ownership',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000001/indenture.pdf', 'indenture.pdf', 1000, 'application/pdf'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ownership',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002/deed.docx', 'deed.docx', 1000,
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'site_plan',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000003/plan.tiff', 'plan.tiff', 1000, 'image/tiff'),
  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'supporting',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000004/letter.pdf', 'letter.pdf', 1000, 'application/pdf'),
  ('dddddddd-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'site_plan',
   'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000006/photo.heic', 'photo.heic', 1000, 'image/heic'),
  ('dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'ownership',
   'aaaaaaaa-0000-0000-0000-000000000002/dddddddd-0000-0000-0000-000000000005/draft.pdf', 'draft.pdf', 1000, 'application/pdf');
insert into storage.objects (bucket_id, name, metadata) values
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000001/indenture.pdf',
   '{"mimetype": "application/pdf"}'),
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002/deed.docx',
   '{"mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}'),
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000003/plan.tiff',
   '{"mimetype": "image/tiff"}'),
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000006/photo.heic',
   '{"mimetype": "image/heic"}'),
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000004/letter.pdf',
   '{"mimetype": "application/msword"}'),
  ('property-documents', 'aaaaaaaa-0000-0000-0000-000000000002/dddddddd-0000-0000-0000-000000000005/draft.pdf',
   '{"mimetype": "application/pdf"}');

set local role authenticated;

-- who can record

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000001', 'ready') $$,
  '42501', null, 'an owner can''t record a preview');
select throws_ok(
  $$ update public.property_documents set preview_status = 'ready' where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  '42501', null, 'an owner can''t set preview_status directly');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('property-document-previews', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002.pdf',
             '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'an owner can''t store a preview');

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000001', 'ready') $$,
  '42501', null, 'an admin without a second factor can''t record a preview');

-- Kofi with a second factor
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000001', 'pending') $$,
  '23514', 'Choose ready, failed or type_mismatch.', 'only the three outcomes can be recorded');
select throws_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000005', 'ready') $$,
  'P0002', 'Document not found.', 'a draft''s document is not found');
select throws_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-00000000ffff', 'ready') $$,
  'P0002', 'Document not found.', 'a missing document is not found');

-- a PDF: closed until checked, open after

select is(
  (select count(*)::int from storage.objects
   where name = 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000001/indenture.pdf'),
  0, 'an admin can''t read a PDF before its type is checked');
select lives_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000001', 'ready') $$,
  'the admin records that the PDF passed the check');
select results_eq(
  $$ select preview_status, preview_path from public.property_documents where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  $$ values ('ready'::text, null::text) $$,
  'a PDF is ready with no converted copy');
select is(
  (select count(*)::int from storage.objects
   where name = 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000001/indenture.pdf'),
  1, 'an admin can read the PDF once it passed the check');
select throws_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000001', 'failed') $$,
  '23514', 'This document has already been checked.', 'a ready document can''t be recorded again');

-- a "PDF" stored as a Word file: recorded ready, still closed, because the browser would be given the stored type

select lives_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000004', 'ready') $$,
  'a document recorded as a PDF can be marked ready');
select is(
  (select count(*)::int from storage.objects
   where name = 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000004/letter.pdf'),
  0, 'an admin can''t read a file stored as Word, even when the document says PDF');

-- a Word file: the original stays closed, the converted PDF opens

select throws_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000002', 'ready') $$,
  '23514', 'The converted PDF isn''t in storage.', 'a Word file isn''t ready until its PDF is stored');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('property-document-previews', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000001.pdf',
             '22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'an admin can''t store a preview for a PDF, which needs none');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('property-document-previews', 'aaaaaaaa-0000-0000-0000-000000000001/somewhere-else.pdf',
             '22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'an admin can''t store a preview at any other path');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('property-document-previews', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002.pdf',
             '22222222-2222-2222-2222-222222222222') $$,
  'an admin stores the converted PDF at the Word file''s preview path');
select is(
  (select count(*)::int from storage.objects
   where name = 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002.pdf'),
  0, 'the converted PDF can''t be read until it is recorded');
select lives_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000002', 'ready') $$,
  'the admin records the conversion');
select results_eq(
  $$ select preview_status, preview_path from public.property_documents where id = 'dddddddd-0000-0000-0000-000000000002' $$,
  $$ values ('ready'::text, 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002.pdf'::text) $$,
  'the Word file is ready, with the path of its PDF');
select is(
  (select count(*)::int from storage.objects
   where name = 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002.pdf'),
  1, 'an admin can read the converted PDF');
select is(
  (select count(*)::int from storage.objects
   where name = 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000002/deed.docx'),
  0, 'an admin still can''t read the original Word file');

-- a HEIC photo from before: it can't be converted or shown, so it can't be ready

select throws_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000006', 'ready') $$,
  '23514', 'This type of document can''t be shown.', 'a HEIC photo can''t be marked ready');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('property-document-previews', 'aaaaaaaa-0000-0000-0000-000000000001/dddddddd-0000-0000-0000-000000000006.pdf',
             '22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'an admin can''t store a preview for a HEIC photo');

-- a TIFF scan: a failed conversion can be tried again; a mismatch is final and audited

select lives_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000003', 'failed') $$,
  'the admin records a failed conversion');
select lives_ok(
  $$ select public.record_document_preview('dddddddd-0000-0000-0000-000000000003', 'type_mismatch') $$,
  'after a failure, the admin can record another outcome');

reset role;
select results_eq(
  $$ select actor_id, metadata ->> 'document_id' from public.audit_logs
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'document_type_mismatch' $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid, 'dddddddd-0000-0000-0000-000000000003'::text) $$,
  'a mismatch is written to the audit log with the admin and the document');

select * from finish();
rollback;
