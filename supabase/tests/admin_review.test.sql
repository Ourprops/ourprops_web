-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
begin;
create extension if not exists pgtap with schema extensions;

select plan(38);

-- Ama and Yaw are owners, Kofi is an admin with a verified authenticator app.
-- set up as superuser, because users can't make themselves admins or change a property's status.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ama@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'kofi@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'yaw@example.test');
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Ama Mensah', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Kofi Boateng', 'admin'),
  ('33333333-3333-3333-3333-333333333333', 'Yaw Asante', 'owner');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Phone', 'totp', 'verified', now(), now());

-- Ama's plot and Yaw's plot overlap, and Yaw has a draft over both. all three start as drafts so their
-- boundaries can be saved; Ama's and Yaw's first plot are then submitted.
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'draft',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'draft',
   'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', 'Adenta', 'inheritance'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'draft',
   'Draft plot', null, null, null, null, null);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select public.save_draft_boundary('aaaaaaaa-0000-0000-0000-000000000001',
  '{"type": "Polygon", "coordinates": [[[-0.200, 5.600], [-0.199, 5.600], [-0.199, 5.601], [-0.200, 5.601], [-0.200, 5.600]]]}');
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select public.save_draft_boundary('aaaaaaaa-0000-0000-0000-000000000002',
  '{"type": "Polygon", "coordinates": [[[-0.1995, 5.600], [-0.1985, 5.600], [-0.1985, 5.601], [-0.1995, 5.601], [-0.1995, 5.600]]]}');
select public.save_draft_boundary('aaaaaaaa-0000-0000-0000-000000000003',
  '{"type": "Polygon", "coordinates": [[[-0.2005, 5.600], [-0.1980, 5.600], [-0.1980, 5.601], [-0.2005, 5.601], [-0.2005, 5.600]]]}');
reset role;

update public.properties set status = 'submitted'
where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');

set local role authenticated;

-- reads

-- Kofi signed in with a password only
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select is(
  (select count(*)::int from public.properties),
  0,
  'an admin without a second factor reads no properties'
);

-- Kofi signed in with a second factor
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select set_eq(
  $$ select id from public.properties $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid), ('aaaaaaaa-0000-0000-0000-000000000002'::uuid) $$,
  'an admin reads submitted properties but not drafts'
);

select set_eq(
  $$ select property_id from public.property_boundaries $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid), ('aaaaaaaa-0000-0000-0000-000000000002'::uuid) $$,
  'an admin reads the boundaries of submitted properties but not drafts'
);

select ok(
  (select count(*) from public.property_overlap_flags) > 0,
  'an admin reads the overlap flag between two submitted properties'
);

select is(
  (select count(*)::int from public.property_overlap_flags
   where 'aaaaaaaa-0000-0000-0000-000000000003' in (property_id, conflicting_property_id)),
  0,
  'an admin reads no overlap flag that involves a draft'
);

select is(
  (select count(*)::int from public.profiles),
  3,
  'an admin reads every profile, to see who owns a property'
);

-- Ama, an owner
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select set_eq(
  $$ select id from public.properties $$,
  $$ values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid) $$,
  'an owner still reads only their own properties'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'an owner still reads only their own profile'
);

-- Ama with a second factor is still not an admin
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);
select is(
  (select count(*)::int from public.property_overlap_flags),
  0,
  'an owner reads no overlap flags, even with a second factor'
);

-- start_review

select throws_ok(
  $$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null,
  'an owner can''t start a review'
);

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null,
  'an admin without a second factor can''t start a review'
);

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok(
  $$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000003') $$,
  'P0002', null,
  'a draft can''t be reviewed, and looks as if it doesn''t exist'
);

-- update_checkpoint before the review starts
select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'boundary_mapped', 'verified', null, null) $$,
  '23514', null,
  'checkpoints can''t be changed before the review starts'
);

select lives_ok(
  $$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'an admin with a second factor starts a review'
);

select is(
  (select status from public.properties where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'under_review',
  'the property is now in review'
);

select set_eq(
  $$ select checkpoint_key from public.property_checkpoints
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and status = 'unverified' $$,
  $$ values ('identity_verified'), ('ownership_claim_verified'), ('boundary_mapped'), ('cadastral_cross_check'),
            ('overlap_clearance'), ('official_search_status'), ('encumbrance_clearance') $$,
  'starting a review creates the seven checkpoints, all unverified'
);

select results_eq(
  $$ select actor_id from public.audit_logs where action = 'property_review_started' $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'the audit log records who started the review, which is how the console shows the reviewer'
);

select throws_ok(
  $$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23514', null,
  'a review can''t be started twice'
);

-- update_checkpoint

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'boundary_mapped', 'submitted', null, null) $$,
  '23514', null,
  'an admin can''t set a checkpoint to submitted'
);

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'ownership_claim_verified', 'waived', 'Not needed', null) $$,
  '23514', null,
  'ownership can''t be waived'
);

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'identity_verified', 'waived', 'Not needed', null) $$,
  '23514', null,
  'identity can''t be waived'
);

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'cadastral_cross_check', 'waived', '  ', null) $$,
  '23514', null,
  'a waiver needs a public note saying why'
);

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'boundary_mapped', 'flagged', null, null) $$,
  '23514', null,
  'flagging needs a public note saying why'
);

select lives_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'cadastral_cross_check', 'waived',
       'No cadastral record exists for this area yet', 'Checked with the regional office on 28 October') $$,
  'an admin waives a checkpoint with a public note'
);

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'identity_verified', 'verified', null, null) $$,
  '23514', null,
  'identity can''t be verified before the owner''s identity document is'
);

reset role;
insert into public.identity_documents (profile_id, document_type, issuing_country, document_number, expires_on, file_path, verification_status)
values ('11111111-1111-1111-1111-111111111111', 'ghana_card', 'GH', 'GHA-123456789-0', current_date + 365,
        '11111111-1111-1111-1111-111111111111/card.jpg', 'verified');
set local role authenticated;

select lives_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'identity_verified', 'verified', null, null) $$,
  'identity can be verified once the owner''s identity document is'
);

select lives_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'boundary_mapped', 'verified', null, 'Matches the site plan') $$,
  'an admin verifies a checkpoint'
);

select results_eq(
  $$ select verified_by, verified_at is not null, internal_notes from public.property_checkpoints
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'boundary_mapped' $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid, true, 'Matches the site plan'::text) $$,
  'verifying records who verified it and when, with the internal note'
);

select lives_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'boundary_mapped', 'in_progress', null, null) $$,
  'an admin moves a verified checkpoint back to in progress'
);

select results_eq(
  $$ select verified_by, verified_at from public.property_checkpoints
     where property_id = 'aaaaaaaa-0000-0000-0000-000000000001' and checkpoint_key = 'boundary_mapped' $$,
  $$ values (null::uuid, null::timestamptz) $$,
  'a checkpoint that is no longer verified says nobody verified it'
);

select results_eq(
  $$ select metadata ->> 'old_status', metadata ->> 'new_status', metadata ->> 'internal_note'
     from public.audit_logs
     where action = 'checkpoint_updated' and metadata ->> 'checkpoint_key' = 'boundary_mapped'
     order by created_at, (metadata ->> 'new_status') = 'in_progress' $$,
  $$ values ('unverified'::text, 'verified'::text, 'Matches the site plan'::text),
            ('verified'::text, 'in_progress'::text, null::text) $$,
  'every change is in the audit log with the old and new status and the notes, which the row overwrites'
);

-- the encumbrance trigger also holds through update_checkpoint
select lives_ok(
  $$ select public.record_encumbrance('aaaaaaaa-0000-0000-0000-000000000001', 'litigation', 'SUIT NO. LD/0456/2026', true, null) $$,
  'an admin records a court case that blocks activation'
);

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'encumbrance_clearance', 'verified', null, null) $$,
  '23514', null,
  'update_checkpoint can''t verify encumbrance clearance while a blocking encumbrance is open'
);

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'not_a_checkpoint', 'verified', null, null) $$,
  'P0002', null,
  'an unknown checkpoint isn''t found'
);

-- owners after the review has started

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok(
  $$ select public.update_checkpoint('aaaaaaaa-0000-0000-0000-000000000001', 'boundary_mapped', 'verified', null, null) $$,
  '42501', null,
  'an owner can''t update a checkpoint on their own property'
);

select is(
  (select count(*)::int from public.property_checkpoints),
  0,
  'an owner can''t read checkpoints directly, so internal notes stay hidden'
);

select is(
  (select count(*)::int from public.audit_logs),
  0,
  'an owner can''t read the audit log'
);

-- signed out

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok(
  $$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000002') $$,
  '42501', null,
  'signed-out users can''t call start_review'
);

reset role;

select * from finish();
rollback;
