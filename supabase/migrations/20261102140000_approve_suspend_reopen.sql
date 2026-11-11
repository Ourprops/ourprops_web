-- the property's way through and out of verification (docs/admin.md, section 5): approve it, suspend it,
-- and take a suspended property back into review. all admin-only, all need a second factor.

-- why a property is suspended, which the owner sees after "Your property's verification is paused".
-- owners read their own property's row, so they see it; nobody writes it except suspend_property and
-- reopen_review, because users hold no update grant on it.
alter table public.properties add column suspension_reason text;

-- set exactly while the property is suspended. not valid, so a property suspended by hand before this
-- migration isn't refused; it still has to satisfy the check the next time its row changes.
alter table public.properties add constraint properties_suspension_reason_check
  check ((status = 'suspended') = (suspension_reason is not null)) not valid;

-- the owner is told when their property is suspended, as when it is approved
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
    'dataroom.access_denied'
  ));

-- everything that still stands between a property in review and approval, in plain words, in a fixed order.
-- the console lists these next to the approve button; approve_property refuses while there are any.
-- it doesn't check the property's status: approve_property does that first.
create or replace function public.approval_blockers(property_id uuid)
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  checkpoint record;
  unreviewed int;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can approve properties.' using errcode = '42501';
  end if;

  -- each of the seven in console order, including any that is missing. the names match CHECKPOINT_LABELS
  -- in lib/admin/labels.ts. ownership and identity can't be waived, so only verified counts for them.
  for checkpoint in
    select
      keys.label,
      keys.key in ('ownership_claim_verified', 'identity_verified') as must_verify,
      property_checkpoints.status
    from (
      values
        (1, 'identity_verified', 'Owner''s identity'),
        (2, 'ownership_claim_verified', 'Ownership claim'),
        (3, 'boundary_mapped', 'Boundary mapped'),
        (4, 'cadastral_cross_check', 'Cadastral cross-check'),
        (5, 'overlap_clearance', 'No overlaps'),
        (6, 'official_search_status', 'Lands Commission search'),
        (7, 'encumbrance_clearance', 'Court cases and encumbrances')
    ) as keys (position, key, label)
    left join public.property_checkpoints
      on property_checkpoints.property_id = approval_blockers.property_id
     and property_checkpoints.checkpoint_key = keys.key
    order by keys.position
  loop
    if checkpoint.must_verify and checkpoint.status is distinct from 'verified' then
      return next checkpoint.label || ' isn''t verified.';
    elsif not checkpoint.must_verify and checkpoint.status is distinct from 'verified'
          and checkpoint.status is distinct from 'waived' then
      return next checkpoint.label || ' isn''t verified or waived.';
    end if;
  end loop;

  if exists (
    select 1 from public.properties
    where properties.id = approval_blockers.property_id
      and (properties.ownership_type is null or properties.ownership_structure is null)
  ) then
    return next 'The ownership type and structure aren''t classified.';
  end if;

  select count(*) into unreviewed
  from public.property_documents
  where property_documents.property_id = approval_blockers.property_id
    and property_documents.verification_status = 'unreviewed';

  if unreviewed = 1 then
    return next '1 document still needs reviewing.';
  elsif unreviewed > 1 then
    return next unreviewed || ' documents still need reviewing.';
  end if;

  -- only flags the admin can see and resolve: an overlap with someone's draft is hidden from admins
  -- (property_overlap_flags_select_admin), and would otherwise block approval with no way to clear it
  if exists (
    select 1 from public.property_overlap_flags
    join public.properties as subject on subject.id = property_overlap_flags.property_id
    join public.properties as other on other.id = property_overlap_flags.conflicting_property_id
    where approval_blockers.property_id in (property_overlap_flags.property_id, property_overlap_flags.conflicting_property_id)
      and property_overlap_flags.status in ('detected', 'investigating')
      and subject.status <> 'draft'
      and other.status <> 'draft'
  ) then
    return next 'An overlap with another property is still open.';
  end if;

  -- still to come with property_document_requests (build order, step 5): no document request is still open
end;
$$;

-- makes a property in review active, once nothing blocks it, and tells the owner.
create or replace function public.approve_property(property_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
  blockers text[];
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can approve properties.' using errcode = '42501';
  end if;

  -- locked first: update_checkpoint, classify_property, review_document and resolve_overlap lock it too,
  -- so nothing approval depends on can change between the check and the update
  select * into property
  from public.properties
  where id = approve_property.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'under_review' then
    raise exception 'Only a property in review can be approved.' using errcode = '23514';
  end if;

  blockers := array(select public.approval_blockers(approve_property.property_id));

  if cardinality(blockers) > 0 then
    raise exception 'This property can''t be approved yet. %', array_to_string(blockers, ' ')
      using errcode = '23514';
  end if;

  update public.properties
  set status = 'active'
  where id = approve_property.property_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (caller, approve_property.property_id, 'property_approved', null);

  -- the owner's message never names the admin (section 5, "What owners see")
  insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
  values (
    property.submitted_by,
    'property.approved',
    'property',
    approve_property.property_id,
    'Your property is verified',
    property.name || ' has been verified by the OurProps review team.',
    '/account/dashboard'
  );
end;
$$;

-- pauses an active property's verification, with a reason the owner sees. also how a property is expired
-- by hand, with the reason "Verification expired" (section 5, "Expiring a property").
create or replace function public.suspend_property(property_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can suspend properties.' using errcode = '42501';
  end if;

  reason := nullif(trim(reason), '');

  if reason is null then
    raise exception 'Give the reason the owner will see.' using errcode = '23514';
  end if;

  select * into property
  from public.properties
  where id = suspend_property.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'active' then
    raise exception 'Only an active property can be suspended.' using errcode = '23514';
  end if;

  update public.properties
  set status = 'suspended',
      suspension_reason = reason
  where id = suspend_property.property_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (caller, suspend_property.property_id, 'property_suspended', jsonb_build_object('reason', reason));

  insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
  values (
    property.submitted_by,
    'property.suspended',
    'property',
    suspend_property.property_id,
    'Your property''s verification is paused',
    reason,
    '/account/dashboard'
  );
end;
$$;

-- takes a suspended property back into review. it never goes straight back to active: the admin resets the
-- checkpoints the suspension was about (at least one) and it goes through approve_property again.
-- the note is internal; the owner sees the property in review again, as before its first approval.
create or replace function public.reopen_review(property_id uuid, note text, checkpoints text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
  keys text[];
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can reopen reviews.' using errcode = '42501';
  end if;

  note := nullif(trim(note), '');

  if note is null then
    raise exception 'Add a note saying why the review is reopened.' using errcode = '23514';
  end if;

  keys := array(select distinct unnest(checkpoints) order by 1);

  if cardinality(keys) = 0 or array_position(keys, null) is not null then
    raise exception 'Choose at least one checkpoint to check again.' using errcode = '23514';
  end if;

  if not keys <@ array[
    'identity_verified',
    'ownership_claim_verified',
    'boundary_mapped',
    'cadastral_cross_check',
    'overlap_clearance',
    'official_search_status',
    'encumbrance_clearance'
  ] then
    raise exception 'Choose checkpoints from the list.' using errcode = '23514';
  end if;

  select * into property
  from public.properties
  where id = reopen_review.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'suspended' then
    raise exception 'Only a suspended property can be reopened.' using errcode = '23514';
  end if;

  update public.properties
  set status = 'under_review',
      suspension_reason = null
  where id = reopen_review.property_id;

  -- back to unverified, with nobody's verification and no public note left on it. the internal notes stay,
  -- as the reviewer's record of what was checked before. a missing row is created, as start_review would.
  insert into public.property_checkpoints (property_id, checkpoint_key)
  select reopen_review.property_id, key
  from unnest(keys) as key
  on conflict on constraint property_checkpoints_property_id_checkpoint_key_key do update
    set status = 'unverified',
        verified_by = null,
        verified_at = null,
        public_notes = null,
        updated_at = now();

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    reopen_review.property_id,
    'review_reopened',
    jsonb_build_object('checkpoints', to_jsonb(keys), 'note', note)
  );
end;
$$;

revoke all on function public.approval_blockers(uuid) from public, anon;
revoke all on function public.approve_property(uuid) from public, anon;
revoke all on function public.suspend_property(uuid, text) from public, anon;
revoke all on function public.reopen_review(uuid, text, text[]) from public, anon;
grant execute on function public.approval_blockers(uuid) to authenticated;
grant execute on function public.approve_property(uuid) to authenticated;
grant execute on function public.suspend_property(uuid, text) to authenticated;
grant execute on function public.reopen_review(uuid, text, text[]) to authenticated;
