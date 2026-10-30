-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- Ama owns a property under review, Yaw is another owner, Kofi is an admin with a verified authenticator app.
-- set up as superuser, because users can't make themselves admins or write checkpoints.
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
-- a submitted property needs the answers properties_complete_unless_draft requires; a draft doesn't
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'under_review',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase');
insert into public.properties (id, submitted_by, status) values
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'draft');
insert into public.property_checkpoints (property_id, checkpoint_key, status, verified_by, verified_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'encumbrance_clearance', 'verified', '22222222-2222-2222-2222-222222222222', now());

set local role authenticated;

-- who can record

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(
  $$ select public.record_encumbrance('aaaaaaaa-0000-0000-0000-000000000001', 'mortgage', 'LC/123', false, null) $$,
  '42501', null,
  'an owner can''t record an encumbrance'
);

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(
  $$ select public.record_encumbrance('aaaaaaaa-0000-0000-0000-000000000001', 'mortgage', 'LC/123', false, null) $$,
  '42501', null,
  'an admin signed in with only a password can''t record an encumbrance'
);

-- Kofi signed in with a second factor from here on
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

select throws_ok(
  $$ select public.record_encumbrance('aaaaaaaa-0000-0000-0000-000000000002', 'mortgage', 'LC/123', false, null) $$,
  '23514', null,
  'a draft can''t have an encumbrance recorded'
);

select throws_ok(
  $$ select public.record_encumbrance('aaaaaaaa-0000-0000-0000-000000000001', 'mortgage', 'LC/123', null, null) $$,
  '23502', null,
  'the admin must say whether it blocks activation; there is no default'
);

-- a mortgage that doesn't block leaves the checkpoint alone

select lives_ok(
  $$ select public.record_encumbrance('aaaaaaaa-0000-0000-0000-000000000001', 'mortgage', 'LC/123', false, 'Bank mortgage, disclosed') $$,
  'an admin records a mortgage that doesn''t block activation'
);

-- checkpoints and the audit log have no admin read access yet, so they are checked as superuser
reset role;
select is(
  (select status from public.property_checkpoints where checkpoint_key = 'encumbrance_clearance'),
  'verified',
  'an encumbrance that doesn''t block leaves the checkpoint verified'
);
set local role authenticated;

-- a court case that blocks flags the checkpoint

select lives_ok(
  $$ select public.record_encumbrance('aaaaaaaa-0000-0000-0000-000000000001', 'litigation', 'SUIT NO. LD/0456/2026', true, 'Ownership disputed at the High Court') $$,
  'an admin records a court case that blocks activation'
);

reset role;

select results_eq(
  $$ select status, verified_by from public.property_checkpoints where checkpoint_key = 'encumbrance_clearance' $$,
  $$ values ('flagged'::text, null::uuid) $$,
  'a blocking encumbrance flags the checkpoint and clears who verified it'
);

select is(
  (select count(*)::int from public.audit_logs where action = 'encumbrance_recorded'),
  2,
  'each recorded encumbrance writes the audit log'
);

-- the checkpoint can't be cleared while the court case is open, whoever writes it

select throws_ok(
  $$ update public.property_checkpoints set status = 'verified' where checkpoint_key = 'encumbrance_clearance' $$,
  '23514', null,
  'the checkpoint can''t be verified while a blocking encumbrance is open'
);

select throws_ok(
  $$ update public.property_checkpoints set status = 'waived' where checkpoint_key = 'encumbrance_clearance' $$,
  '23514', null,
  'the checkpoint can''t be waived while a blocking encumbrance is open'
);

set local role authenticated;

-- changing an encumbrance

select throws_ok(
  $$ select public.update_encumbrance(
       (select id from public.property_encumbrances where kind = 'litigation'), true, 'resolved', '  ') $$,
  '23514', null,
  'a change needs a reason'
);

select lives_ok(
  $$ select public.update_encumbrance(
       (select id from public.property_encumbrances where kind = 'litigation'), true, 'resolved', 'Case struck out') $$,
  'an admin resolves the court case with a reason'
);

select results_eq(
  $$ select resolved_by from public.property_encumbrances where kind = 'litigation' $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'resolving records who resolved it'
);

reset role;

select is(
  (select metadata ->> 'reason' from public.audit_logs where action = 'encumbrance_updated'),
  'Case struck out',
  'the reason for the change is in the audit log'
);

select lives_ok(
  $$ update public.property_checkpoints set status = 'verified' where checkpoint_key = 'encumbrance_clearance' $$,
  'once the blocking encumbrance is resolved, the checkpoint can be verified'
);

set local role authenticated;

-- what an owner sees

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);

select is(
  (select count(*)::int from public.property_encumbrances),
  0,
  'an owner reads nothing from the table directly, so internal notes stay hidden'
);

select results_eq(
  $$ select kind, reference, blocks_activation, status
     from public.property_encumbrances_for_owner('aaaaaaaa-0000-0000-0000-000000000001') $$,
  $$ values ('mortgage'::text, 'LC/123'::text, false, 'open'::text),
            ('litigation'::text, 'SUIT NO. LD/0456/2026'::text, true, 'resolved'::text) $$,
  'an owner sees the encumbrances on their own property'
);

select ok(
  not exists (
    select 1
    from information_schema.routines r
    join information_schema.parameters p on p.specific_name = r.specific_name
    where r.routine_schema = 'public'
      and r.routine_name = 'property_encumbrances_for_owner'
      and p.parameter_mode = 'OUT'
      and p.parameter_name in ('internal_notes', 'recorded_by', 'resolved_by')
  ),
  'what owners read leaves out internal notes and which admins recorded or resolved it'
);

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "aal": "aal1"}', true);

select is(
  (select count(*)::int from public.property_encumbrances_for_owner('aaaaaaaa-0000-0000-0000-000000000001')),
  0,
  'another owner sees nothing on a property that isn''t theirs'
);

-- signed out

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.property_encumbrances_for_owner('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null,
  'signed-out users can''t read encumbrances, so the public page has nothing to show'
);

select throws_ok(
  $$ select * from public.property_encumbrances $$,
  '42501', null,
  'signed-out users can''t read the table'
);

reset role;

select * from finish();
rollback;
