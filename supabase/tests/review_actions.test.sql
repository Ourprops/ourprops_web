-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(83);

-- Ama and Yaw are owners. Kofi is an admin and Efua a partner verifier, both with a verified authenticator app.
-- set up as superuser, because users can't make themselves staff, write documents' review fields or flags.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'yaw@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'efua@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin'),
  ('33333333-3333-3333-3333-333333333333', 'Yaw Asante', 'owner'),
  ('44444444-4444-4444-4444-444444444444', 'Efua Owusu', 'partner_verifier');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '44444444-4444-4444-4444-444444444444', 'Phone', 'totp', 'verified', now(), now());

-- Ama's plot is the one taken through review. Yaw's submitted plot overlaps it, and so does Yaw's draft.
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'submitted',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'submitted',
   'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', 'Adenta', 'inheritance');
insert into public.properties (id, submitted_by, status) values
  ('aaaaaaaa-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'draft');

insert into public.property_documents (id, property_id, uploaded_by, slot, declared_type, file_path, file_name, file_size_bytes, mime_type) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'ownership', 'indenture', 'aaaaaaaa-0000-0000-0000-000000000001/indenture.pdf', 'indenture.pdf', 1000, 'application/pdf'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'site_plan', null, 'aaaaaaaa-0000-0000-0000-000000000001/plan.jpg', 'plan.jpg', 1000, 'image/jpeg'),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333',
   'ownership', null, 'aaaaaaaa-0000-0000-0000-000000000003/deed.pdf', 'deed.pdf', 1000, 'application/pdf');

insert into public.property_overlap_flags (id, property_id, conflicting_property_id, overlap_area_sqm, overlap_percentage_subject) values
  ('ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 120, 10),
  ('ffffffff-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 50, 4);

insert into public.identity_documents (profile_id, document_type, issuing_country, document_number, expires_on, file_path, verification_status)
values ('11111111-1111-1111-1111-111111111111', 'ghana_card', 'GH', 'GHA-123456789-0', current_date + 365,
        '11111111-1111-1111-1111-111111111111/card.jpg', 'unreviewed');
-- verified the way review_identity_document leaves it: the number is gone, the fingerprint stays
update public.identity_documents set verification_status = 'verified', document_number = null
  where profile_id = '11111111-1111-1111-1111-111111111111';

set local role authenticated;

-- who can act: nobody but an admin with a second factor

-- Ama, the owner, even with a second factor
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'state_lease', 'sole') $$,
  '42501', null, 'an owner can''t classify their own property');
select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000001', 'indenture', 'accepted', null) $$,
  '42501', null, 'an owner can''t review their own document');
select throws_ok($$ select public.resolve_overlap('ffffffff-0000-0000-0000-000000000001', 'resolved_false_positive', 'Fine') $$,
  '42501', null, 'an owner can''t resolve an overlap');
select throws_ok($$ select public.approval_blockers('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'an owner can''t read what blocks approval');
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'an owner can''t approve their own property');
select throws_ok($$ select public.suspend_property('aaaaaaaa-0000-0000-0000-000000000001', 'Because') $$,
  '42501', null, 'an owner can''t suspend a property');
select throws_ok($$ select public.reopen_review('aaaaaaaa-0000-0000-0000-000000000001', 'Because', array['boundary_mapped']) $$,
  '42501', null, 'an owner can''t reopen a review');

-- Efua, a partner verifier with a second factor, gets nothing in V1
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'state_lease', 'sole') $$,
  '42501', null, 'a partner verifier can''t classify a property');
select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000001', 'indenture', 'accepted', null) $$,
  '42501', null, 'a partner verifier can''t review a document');
select throws_ok($$ select public.resolve_overlap('ffffffff-0000-0000-0000-000000000001', 'investigating', null) $$,
  '42501', null, 'a partner verifier can''t resolve an overlap');
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'a partner verifier can''t approve a property');
select throws_ok($$ select public.suspend_property('aaaaaaaa-0000-0000-0000-000000000001', 'Because') $$,
  '42501', null, 'a partner verifier can''t suspend a property');

-- Kofi signed in with a password only
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);

select throws_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'state_lease', 'sole') $$,
  '42501', null, 'an admin without a second factor can''t classify a property');
select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000001', 'indenture', 'accepted', null) $$,
  '42501', null, 'an admin without a second factor can''t review a document');
select throws_ok($$ select public.resolve_overlap('ffffffff-0000-0000-0000-000000000001', 'investigating', null) $$,
  '42501', null, 'an admin without a second factor can''t resolve an overlap');
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'an admin without a second factor can''t approve a property');
select throws_ok($$ select public.suspend_property('aaaaaaaa-0000-0000-0000-000000000001', 'Because') $$,
  '42501', null, 'an admin without a second factor can''t suspend a property');
select throws_ok($$ select public.reopen_review('aaaaaaaa-0000-0000-0000-000000000001', 'Because', array['boundary_mapped']) $$,
  '42501', null, 'an admin without a second factor can''t reopen a review');

-- Kofi signed in with a second factor from here on
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

-- before the review starts

select throws_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000003', 'state_lease', 'sole') $$,
  'P0002', null, 'a draft can''t be classified, and looks as if it doesn''t exist');
select throws_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'state_lease', 'sole') $$,
  '23514', null, 'a property can''t be classified before its review starts');
select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000001', 'indenture', 'accepted', null) $$,
  '23514', null, 'a document can''t be reviewed before the review starts');
select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000003', 'indenture', 'accepted', null) $$,
  'P0002', null, 'a draft''s document looks as if it doesn''t exist');

select lives_ok($$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000001') $$, 'the review starts');

-- classify_property

select throws_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'freehold', 'sole') $$,
  '23514', 'Choose an ownership type.', 'an unknown ownership type is refused in plain words');
select throws_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'state_lease', null) $$,
  '23514', 'Choose an ownership structure.', 'the structure is required');
select lives_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'stool_sublease', 'sole') $$,
  'an admin classifies the ownership');
select lives_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'state_lease', 'co_owned') $$,
  'the classification can be changed while in review');
select results_eq(
  $$ select ownership_type, ownership_structure from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('state_lease'::text, 'co_owned'::text) $$,
  'the property has the latest classification');
select results_eq(
  $$ select metadata ->> 'old_ownership_type', metadata ->> 'new_ownership_type' from public.audit_logs
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'property_classified'
     order by created_at, metadata ->> 'old_ownership_type' nulls first $$,
  $$ values (null::text, 'stool_sublease'::text), ('stool_sublease'::text, 'state_lease'::text) $$,
  'each classification is in the audit log with what it replaced');

-- review_document

select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000001', 'indenture', 'unreviewed', null) $$,
  '23514', null, 'an admin can''t send a document back to unreviewed');
select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000002', null, 'accepted', null) $$,
  '23514', 'Set the document type before accepting it.', 'a document needs a final type to be accepted');
select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000002', null, 'rejected', '  ') $$,
  '23514', 'Add a note telling the owner why.', 'a rejection needs a note for the owner');
select throws_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000001', 'not_a_type', 'accepted', null) $$,
  '23514', 'Choose a document type from the list.', 'an unknown document type is refused in plain words');
select lives_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000001', 'deed_of_assignment', 'accepted', null) $$,
  'an admin accepts a document with its final type');
select results_eq(
  $$ select document_type, verification_status, declared_type, slot from public.property_documents
     where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  $$ values ('deed_of_assignment'::text, 'accepted'::text, 'indenture'::text, 'ownership'::text) $$,
  'the final type and outcome are set, and what the owner said is kept');
select lives_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000002', null, 'rejected', 'The plan is too blurry to read.') $$,
  'an admin rejects a document with a note');
select is(
  (select count(*)::int from public.audit_logs
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'document_reviewed'),
  2, 'each review is in the audit log');

-- resolve_overlap

select throws_ok($$ select public.resolve_overlap('ffffffff-0000-0000-0000-000000000002', 'investigating', null) $$,
  'P0002', null, 'an overlap with a draft looks as if it doesn''t exist');
select throws_ok($$ select public.resolve_overlap('ffffffff-0000-0000-0000-000000000001', 'detected', null) $$,
  '23514', null, 'a flag can''t be sent back to detected');
select throws_ok($$ select public.resolve_overlap('ffffffff-0000-0000-0000-000000000001', 'resolved_false_positive', null) $$,
  '23514', 'Add a note saying how it was resolved.', 'a resolution needs a note');
select lives_ok($$ select public.resolve_overlap('ffffffff-0000-0000-0000-000000000001', 'investigating', null) $$,
  'an admin starts investigating without a note');
select set_eq(
  $$ select property_id from public.audit_logs
     where action = 'overlap_updated' and metadata ->> 'flag_id' = 'ffffffff-0000-0000-0000-000000000001' $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid), ('aaaaaaaa-0000-0000-0000-000000000002'::uuid) $$,
  'the change is in both properties'' histories');

-- approval: one test per condition, each with every other condition met

-- every checkpoint verified, except cadastral_cross_check, which is waived; set as superuser to save steps
reset role;
update public.property_checkpoints
set status = case when checkpoint_key = 'cadastral_cross_check' then 'waived' else 'verified' end,
    public_notes = case when checkpoint_key = 'cadastral_cross_check' then 'No cadastral record for this area' end
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001';
set local role authenticated;

-- still open from above: the rejected document is reviewed, and the overlap is being investigated
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property can''t be approved yet. An overlap with another property is still open.',
  'approval is refused while an overlap is open');

select lives_ok($$ select public.resolve_overlap('ffffffff-0000-0000-0000-000000000001', 'resolved_false_positive', 'Survey shows the plots only touch') $$,
  'the overlap is resolved');

select is(
  (select count(*)::int from public.approval_blockers('aaaaaaaa-0000-0000-0000-000000000001')),
  0, 'nothing blocks approval now, and the overlap with Yaw''s draft, which admins can''t see, doesn''t count');

reset role;
update public.property_checkpoints set status = 'in_progress'
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'identity_verified';
set local role authenticated;
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property can''t be approved yet. Owner''s identity isn''t verified.',
  'approval is refused while identity isn''t verified');

reset role;
update public.property_checkpoints set status = case checkpoint_key when 'identity_verified' then 'verified' else 'waived' end
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key in ('identity_verified', 'ownership_claim_verified');
set local role authenticated;
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property can''t be approved yet. Ownership claim isn''t verified.',
  'approval is refused with ownership waived, even if something wrote it past update_checkpoint');

reset role;
update public.property_checkpoints set status = case checkpoint_key when 'ownership_claim_verified' then 'verified' else 'flagged' end,
    public_notes = case checkpoint_key when 'boundary_mapped' then 'The boundary needs another look' end
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key in ('ownership_claim_verified', 'boundary_mapped');
set local role authenticated;
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property can''t be approved yet. Boundary mapped isn''t verified or waived.',
  'approval is refused while another checkpoint is neither verified nor waived');

reset role;
update public.property_checkpoints set status = 'verified', public_notes = null
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'boundary_mapped';
delete from public.property_checkpoints
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'official_search_status';
set local role authenticated;
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property can''t be approved yet. Lands Commission search isn''t verified or waived.',
  'approval is refused when a checkpoint is missing altogether');

reset role;
insert into public.property_checkpoints (property_id, checkpoint_key, status)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'official_search_status', 'verified');
update public.properties set ownership_structure = null where id = 'aaaaaaaa-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property can''t be approved yet. The ownership type and structure aren''t classified.',
  'approval is refused until the ownership is classified');

select lives_ok($$ select public.classify_property('aaaaaaaa-0000-0000-0000-000000000001', 'state_lease', 'co_owned') $$,
  'the ownership is classified again');

reset role;
insert into public.property_documents (id, property_id, uploaded_by, slot, file_path, file_name, file_size_bytes, mime_type) values
  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'supporting', 'aaaaaaaa-0000-0000-0000-000000000001/receipt.pdf', 'receipt.pdf', 1000, 'application/pdf');
set local role authenticated;
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property can''t be approved yet. 1 document still needs reviewing.',
  'approval is refused while a document is unreviewed');

select lives_ok($$ select public.review_document('dddddddd-0000-0000-0000-000000000004', 'ground_rent_receipts', 'accepted', null) $$,
  'the last document is reviewed');

-- a blocking court case flags encumbrance_clearance through its trigger, which is all approval needs
select lives_ok($$ select public.record_encumbrance('aaaaaaaa-0000-0000-0000-000000000001', 'litigation', 'SUIT NO. LD/0456/2026', true, null) $$,
  'an admin records a court case that blocks activation');
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'This property can''t be approved yet. Court cases and encumbrances isn''t verified or waived.',
  'approval is refused while a blocking encumbrance is open');

select lives_ok($$ select public.update_encumbrance(
    (select id from public.property_encumbrances where property_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
    true, 'resolved', 'Case struck out') $$,
  'the court case is resolved');
select lives_ok($$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'encumbrance_clearance', 'verified', null, null) $$,
  'encumbrance clearance is verified again');

-- approve_property

select lives_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'an admin approves the property, with one checkpoint waived');
select is((select status from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'active',
  'the property is active');
select is(
  (select count(*)::int from public.audit_logs
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'property_approved'
     and actor_id = '22222222-2222-2222-2222-222222222222'),
  1, 'the approval is in the audit log with the admin who gave it');
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', 'Only a property in review can be approved.', 'an active property can''t be approved again');

-- notifications have no read policies yet, so they are checked as superuser
reset role;
select results_eq(
  $$ select recipient_id, type, body not like '%Kofi%' from public.notifications
     where entity_id = 'aaaaaaaa-0000-0000-0000-000000000001' and type = 'property.approved' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid, 'property.approved'::text, true) $$,
  'the owner is told it is verified, without the admin''s name');
select results_eq(
  $$ select title from public.notifications
     where entity_id = 'aaaaaaaa-0000-0000-0000-000000000001' and type = 'property.under_review' $$,
  $$ values ('We''ve started checking your property'::text) $$,
  'the owner was told when the review started');
set local role authenticated;

-- suspend_property

select throws_ok($$ select public.suspend_property('aaaaaaaa-0000-0000-0000-000000000002', 'Verification expired') $$,
  '23514', 'Only an active property can be suspended.', 'a property that isn''t active can''t be suspended');
select throws_ok($$ select public.suspend_property('aaaaaaaa-0000-0000-0000-000000000001', ' ') $$,
  '23514', 'Give the reason the owner will see.', 'a suspension needs a reason');
select lives_ok($$ select public.suspend_property('aaaaaaaa-0000-0000-0000-000000000001', 'Verification expired') $$,
  'an admin suspends the property');

reset role;
select results_eq(
  $$ select type, body from public.notifications
     where entity_id = 'aaaaaaaa-0000-0000-0000-000000000001' and type = 'property.suspended' $$,
  $$ values ('property.suspended'::text, 'Verification expired'::text) $$,
  'the owner is told, with the reason');
select throws_ok(
  $$ update public.properties set status = 'active' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'a suspension reason can''t be left on a property that isn''t suspended');
set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select results_eq(
  $$ select status, suspension_reason from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('suspended'::text, 'Verification expired'::text) $$,
  'the owner reads the reason on their own property');
select is(
  (select review_note from public.property_documents where id = 'dddddddd-0000-0000-0000-000000000002'),
  'The plan is too blurry to read.',
  'the owner reads why their document was rejected');
select throws_ok(
  $$ update public.properties set suspension_reason = null where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'the owner can''t change the suspension reason');
select throws_ok(
  $$ update public.property_documents set review_note = null where id = 'dddddddd-0000-0000-0000-000000000002' $$,
  '42501', null, 'the owner can''t change a document''s review note');

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

-- reopen_review

select throws_ok($$ select public.reopen_review('aaaaaaaa-0000-0000-0000-000000000002', 'Recheck', array['boundary_mapped']) $$,
  '23514', 'Only a suspended property can be reopened.', 'a property that isn''t suspended can''t be reopened');
select throws_ok($$ select public.reopen_review('aaaaaaaa-0000-0000-0000-000000000001', 'Recheck', array[]::text[]) $$,
  '23514', 'Choose at least one checkpoint to check again.', 'at least one checkpoint has to be reset');
select throws_ok($$ select public.reopen_review('aaaaaaaa-0000-0000-0000-000000000001', 'Recheck', array['not_a_checkpoint']) $$,
  '23514', 'Choose checkpoints from the list.', 'an unknown checkpoint is refused');
select throws_ok($$ select public.reopen_review('aaaaaaaa-0000-0000-0000-000000000001', '', array['boundary_mapped']) $$,
  '23514', 'Add a note saying why the review is reopened.', 'reopening needs a note');

reset role;
update public.property_checkpoints set internal_notes = 'Matched the site plan in 2026'
where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'boundary_mapped';
set local role authenticated;

select lives_ok(
  $$ select public.reopen_review('aaaaaaaa-0000-0000-0000-000000000001', 'Neighbour disputes the boundary',
       array['boundary_mapped', 'boundary_mapped']) $$,
  'an admin reopens the review');
select results_eq(
  $$ select status, suspension_reason from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('under_review'::text, null::text) $$,
  'the property is back in review, with no suspension reason');
select results_eq(
  $$ select checkpoint_key, status, verified_by, public_notes, internal_notes from public.property_checkpoints
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and status <> 'verified' and status <> 'waived' $$,
  $$ values ('boundary_mapped'::text, 'unverified'::text, null::uuid, null::text, 'Matched the site plan in 2026'::text) $$,
  'only the chosen checkpoint is reset, and its internal notes are kept');
select is(
  (select metadata -> 'checkpoints' from public.audit_logs
   where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'review_reopened'),
  '["boundary_mapped"]'::jsonb,
  'the audit log records which checkpoints were reset');
select is(
  (select array_agg(blocker) from public.approval_blockers('aaaaaaaa-0000-0000-0000-000000000001') as blocker),
  array['Boundary mapped isn''t verified or waived.'],
  'it can''t be approved again until the reset checkpoint is checked');

-- signed out

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok($$ select public.approve_property('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'signed-out users can''t call approve_property');
select throws_ok($$ select public.approval_blockers('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'signed-out users can''t call approval_blockers');

reset role;

select * from finish();
rollback;
