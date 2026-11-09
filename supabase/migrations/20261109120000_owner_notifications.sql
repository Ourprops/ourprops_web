-- owners see their notifications (docs/admin.md, section 5, "What owners see"). the review functions have written them
-- since build step 4, but nothing could read them: the grants were revoked in 20261019120000. this lets an owner read
-- their own, mark them seen, and adds the ones that were missing: the review starting, the property being checked
-- again, and the identity document's outcome.
--
-- a notification says only that something changed, and links to where the owner sees it. never an ID number, a
-- document's contents, an admin's name, or anything about another account.

-- the new kinds
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'property.submitted',
    'property.under_review',
    'property.changes_requested',
    'property.approved',
    'property.rejected',
    'property.suspended',
    'checkpoint.verified',
    'checkpoint.flagged',
    'document.accepted',
    'document.rejected',
    'overlap.detected',
    'dataroom.access_requested',
    'dataroom.access_granted',
    'dataroom.access_denied',
    'identity.verified',
    'identity.rejected',
    'identity.released'
  ));

alter table public.notifications drop constraint notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check
  check (entity_type in ('property', 'document', 'checkpoint', 'data_room_request', 'identity_document'));

-- an owner reads their own and nobody else's. nobody writes them directly: the database functions and triggers below do,
-- and mark_notifications_seen sets read_at.
grant select on table public.notifications to authenticated;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

-- marks the caller's notifications seen, once the dashboard has shown them. others' ids are ignored, not refused, so
-- it can't be used to learn which ids exist.
create or replace function public.mark_notifications_seen(notification_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where id = any(notification_ids)
    and recipient_id = (select auth.uid())
    and read_at is null
$$;

revoke all on function public.mark_notifications_seen(uuid[]) from public, anon;
grant execute on function public.mark_notifications_seen(uuid[]) to authenticated;

-- a property going into review because of us: the review starting, or the property being checked again after a
-- suspension or a released identity document. not the owner sending it back, which they did themselves.
create or replace function public.properties_notify_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'under_review' and old.status in ('submitted', 'suspended', 'active') then
    insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
    values (
      new.submitted_by,
      'property.under_review',
      'property',
      new.id,
      case when old.status = 'submitted' then 'We''ve started checking your property' else 'We''re checking your property again' end,
      case
        when old.status = 'submitted'
          then coalesce(new.name, 'Your property') || ' is with our review team. We''ll tell you if we need anything from you.'
        else coalesce(new.name, 'Your property') || ' isn''t shown as verified while we check it again. We''ll tell you if we need anything from you.'
      end,
      '/account/dashboard/properties/' || new.id
    );
  end if;
  return new;
end;
$$;

revoke all on function public.properties_notify_review() from public, anon, authenticated;

create trigger properties_notify_review
  after update of status on public.properties
  for each row
  when (old.status is distinct from new.status)
  execute function public.properties_notify_review();

-- the identity document's outcome. a rejection carries the admin's note, which is written for the owner.
create or replace function public.identity_documents_notify_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.verification_status = 'unreviewed' and new.verification_status = 'verified' then
    insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
    values (
      new.profile_id, 'identity.verified', 'identity_document', new.id,
      'Your identity is verified',
      'We checked your document, then deleted the photo and the number. You only have to do this once.',
      '/account/identity'
    );
  elsif old.verification_status = 'unreviewed' and new.verification_status = 'rejected' then
    insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
    values (
      new.profile_id, 'identity.rejected', 'identity_document', new.id,
      'We couldn''t accept your identity document',
      coalesce(new.review_note || ' ', '') || 'Please send it again.',
      '/account/identity'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.identity_documents_notify_review() from public, anon, authenticated;

create trigger identity_documents_notify_review
  after update of verification_status on public.identity_documents
  for each row
  when (old.verification_status is distinct from new.verification_status)
  execute function public.identity_documents_notify_review();

-- release_identity_document, as in 20261106150000, now also telling the account it was released from. the row is
-- deleted, so a trigger couldn't tell a release from anything else; it is said here. the message doesn't say whose
-- the document turned out to be.
create or replace function public.release_identity_document(profile_id uuid, reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  existing public.identity_documents;
  reopened uuid;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can release identity documents.' using errcode = '42501';
  end if;

  reason := nullif(trim(reason), '');

  if reason is null then
    raise exception 'Say why the document is released, for example how the owner proved it is theirs.' using errcode = '23514';
  end if;

  select * into existing
  from public.identity_documents
  where identity_documents.profile_id = release_identity_document.profile_id
  for update;

  if not found then
    raise exception 'Identity document not found.' using errcode = 'P0002';
  end if;

  delete from public.identity_documents
  where identity_documents.profile_id = release_identity_document.profile_id;

  if existing.verification_status = 'verified' then
    update public.property_checkpoints
    set status = 'unverified',
        verified_by = null,
        verified_at = null,
        public_notes = null,
        updated_at = now()
    where checkpoint_key = 'identity_verified'
      and property_id in (
        select properties.id from public.properties
        where properties.submitted_by = release_identity_document.profile_id
      );

    -- properties_notify_review tells the owner each of these is being checked again
    for reopened in
      update public.properties
      set status = 'under_review'
      where properties.submitted_by = release_identity_document.profile_id
        and properties.status = 'active'
      returning properties.id
    loop
      insert into public.audit_logs (actor_id, property_id, action, metadata)
      values (
        caller,
        reopened,
        'review_reopened',
        jsonb_build_object('checkpoints', jsonb_build_array('identity_verified'), 'note', 'Identity document released: ' || reason)
      );
    end loop;
  end if;

  insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
  values (
    existing.profile_id, 'identity.released', 'identity_document', existing.id,
    'Your identity document was removed from your account',
    'It is linked to another account. If you think this is a mistake, contact us. You can add your own document on your identity page.',
    '/account/identity'
  );

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    null,
    'identity_document_released',
    jsonb_build_object(
      'profile_id', existing.profile_id,
      'document_type', existing.document_type,
      'issuing_country', existing.issuing_country,
      'was_verified', existing.verification_status = 'verified',
      'reason', reason
    )
  );

  return existing.file_path;
end;
$$;

revoke all on function public.release_identity_document(uuid, text) from public, anon;
grant execute on function public.release_identity_document(uuid, text) to authenticated;
