-- run with: npx supabase test db
-- everything happens in one transaction that is rolled back, so the local database is left as it was.
-- queries are limited to the rows made here, so data already in the local database doesn't change the results.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

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

-- Ama's plot is submitted, her card waits for review. Yaw's plot is live on a verified card.
insert into public.properties (id, submitted_by, status, name, slug, property_type, region, city_town, acquisition_method) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'submitted',
   'Plot at Oyarifa', 'plot-at-oyarifa', 'land', 'Greater Accra', 'Oyarifa', 'direct_purchase'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'active',
   'Plot at Adenta', 'plot-at-adenta', 'land', 'Greater Accra', 'Adenta', 'inheritance');
insert into public.identity_documents (profile_id, document_type, issuing_country, document_number, expires_on, file_path) values
  ('11111111-1111-1111-1111-111111111111', 'ghana_card', 'GH', 'GHA-123456789-0', current_date + 365,
   '11111111-1111-1111-1111-111111111111/card.jpg'),
  ('33333333-3333-3333-3333-333333333333', 'ghana_card', 'GH', 'GHA-555444333-2', current_date + 365,
   '33333333-3333-3333-3333-333333333333/card.jpg');
update public.identity_documents set verification_status = 'verified', document_number = null, file_path = null
  where profile_id = '33333333-3333-3333-3333-333333333333';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);

-- the review starting

select lives_ok($$ select public.start_review('aaaaaaaa-0000-0000-0000-000000000001') $$, 'Kofi starts reviewing Ama''s plot');
select is(
  (select count(*)::int from public.notifications where entity_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0, 'an admin can''t read owners'' notifications');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select results_eq(
  $$ select type, title, body, action_url from public.notifications where entity_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  $$ values ('property.under_review'::text, 'We''ve started checking your property'::text,
             'Plot at Oyarifa is with our review team. We''ll tell you if we need anything from you.'::text,
             '/account/dashboard/properties/aaaaaaaa-0000-0000-0000-000000000001'::text) $$,
  'Ama is told her plot is being checked, with a link to it');

-- the identity outcome

select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ select public.review_identity_document('11111111-1111-1111-1111-111111111111', 'rejected', 'The photo is blurred.') $$,
  'Kofi rejects Ama''s card');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select results_eq(
  $$ select title, body, action_url from public.notifications where type = 'identity.rejected' $$,
  $$ values ('We couldn''t accept your identity document'::text, 'The photo is blurred. Please send it again.'::text,
             '/account/identity'::text) $$,
  'Ama is told why, and where to send it again');

-- what an owner can and can't do with their notifications

select is((select count(*)::int from public.notifications), 2, 'Ama sees her two notifications');
select is((select count(*)::int from public.notifications where read_at is null), 2, 'both are new');
select throws_ok(
  $$ insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body)
     values ('33333333-3333-3333-3333-333333333333', 'property.approved', 'property',
             'aaaaaaaa-0000-0000-0000-000000000002', 'Your property is verified', 'Fake') $$,
  '42501', null, 'an owner can''t write a notification, to themselves or anyone else');
select throws_ok(
  $$ update public.notifications set read_at = now() $$,
  '42501', null, 'an owner can''t change notifications directly');

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*)::int from public.notifications where recipient_id = '11111111-1111-1111-1111-111111111111'),
  0, 'Yaw can''t see Ama''s notifications');
reset role;
select public.mark_notifications_seen(array(select id from public.notifications
                                            where recipient_id = '11111111-1111-1111-1111-111111111111'));
set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*)::int from public.notifications where read_at is null), 2,
  'marking someone else''s notifications seen does nothing');
select lives_ok(
  $$ select public.mark_notifications_seen(array(select id from public.notifications)) $$,
  'Ama marks hers seen');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'neither is new any more');

-- the owner sending the property back isn't news to them

reset role;
-- as request_changes and resubmit_property leave it, without the rest of what they check
update public.properties
  set status = 'action_required', changes_requested_message = 'Send a clearer site plan', answers_at_request = '{}'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.properties set status = 'under_review', answers_at_request = null, changes_requested_message = null
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.notifications where type = 'property.under_review'
     and entity_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1, 'sending a property back after changes doesn''t notify the owner who sent it');

-- releasing Yaw's verified card

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ select public.release_identity_document('33333333-3333-3333-3333-333333333333', 'Efua proved it is hers on a call') $$,
  'Kofi releases the card Yaw held');

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "aal": "aal1"}', true);
select results_eq(
  $$ select type, title from public.notifications
     where type in ('identity.released', 'property.under_review') order by type $$,
  $$ values ('identity.released'::text, 'Your identity document was removed from your account'::text),
            ('property.under_review'::text, 'We''re checking your property again'::text) $$,
  'Yaw is told his document was removed, and that his live property is being checked again');
select is(
  (select count(*)::int from public.notifications where body like '%Efua%' or body like '%proved%'),
  0, 'without the reason, or who the document belongs to');

-- verifying, and what never appears

reset role;
update public.identity_documents set verification_status = 'unreviewed', review_note = null,
  document_number = 'GHA-123456789-0', file_path = '11111111-1111-1111-1111-111111111111/card2.jpg'
  where profile_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(
  $$ select public.review_identity_document('11111111-1111-1111-1111-111111111111', 'verified', null) $$,
  'Kofi verifies Ama''s new card');

reset role;
select is(
  (select title from public.notifications where type = 'identity.verified'
     and recipient_id = '11111111-1111-1111-1111-111111111111'),
  'Your identity is verified', 'Ama is told her identity is verified');
select is(
  (select count(*)::int from public.notifications
   where body like '%123456789%' or body like '%555444333%' or body like '%Kofi%'),
  0, 'no notification holds an ID number or an admin''s name');

select * from finish();
rollback;
