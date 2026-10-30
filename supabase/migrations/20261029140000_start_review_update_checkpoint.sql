-- the first two review actions (docs/admin.md, section 5). both are admin-only and need a second factor.

-- an admin takes a submitted property into review. it creates the seven checkpoint rows, all unverified.
-- who is reviewing it is the actor of the latest property_review_started entry in audit_logs, so there is
-- no reviewer column on properties for owners to read.
create or replace function public.start_review(property_id uuid)
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
    raise exception 'Only admins can review properties.' using errcode = '42501';
  end if;

  -- locked so two admins starting the same review at once can't both go through
  select * into property
  from public.properties
  where id = start_review.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'submitted' then
    raise exception 'Only a submitted property can be taken into review.' using errcode = '23514';
  end if;

  update public.properties
  set status = 'under_review'
  where id = start_review.property_id;

  -- rows already there are kept as they are, so nothing an admin recorded is lost.
  -- property_checkpoints_checkpoint_key_check refuses a key that isn't one of the seven
  insert into public.property_checkpoints (property_id, checkpoint_key)
  select start_review.property_id, key
  from unnest(array[
    'identity_verified',
    'ownership_claim_verified',
    'boundary_mapped',
    'cadastral_cross_check',
    'overlap_clearance',
    'official_search_status',
    'encumbrance_clearance'
  ]) as key
  -- named by constraint because property_id here would also mean this function's parameter
  on conflict on constraint property_checkpoints_property_id_checkpoint_key_key do nothing;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (caller, start_review.property_id, 'property_review_started', null);
end;
$$;

-- an admin sets one checkpoint's status and notes on a property in review.
-- public_note is what the owner, and once active the public page, sees; internal_note never reaches owners.
-- whether an encumbrance blocks encumbrance_clearance is checked by the trigger on property_checkpoints.
create or replace function public.update_checkpoint(
  property_id uuid,
  checkpoint_key text,
  status text,
  public_note text,
  internal_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
  existing public.property_checkpoints;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can update checkpoints.' using errcode = '42501';
  end if;

  public_note := nullif(trim(public_note), '');
  internal_note := nullif(trim(internal_note), '');

  -- 'submitted' is for evidence an owner has sent, not something an admin sets
  if status is null or status not in ('unverified', 'in_progress', 'verified', 'flagged', 'waived') then
    raise exception 'Choose unverified, in progress, verified, flagged or waived.' using errcode = '23514';
  end if;

  select * into property
  from public.properties
  where id = update_checkpoint.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  -- checkpoints change only in review. an active or suspended property goes back through reopen_review.
  if property.status <> 'under_review' then
    raise exception 'Checkpoints can be changed only while the property is in review.' using errcode = '23514';
  end if;

  select * into existing
  from public.property_checkpoints
  where property_checkpoints.property_id = update_checkpoint.property_id
    and property_checkpoints.checkpoint_key = update_checkpoint.checkpoint_key
  for update;

  if not found then
    raise exception 'Checkpoint not found.' using errcode = 'P0002';
  end if;

  -- a property is worth showing as verified only if the claim is sound and we know who is making it
  if status = 'waived' and checkpoint_key in ('ownership_claim_verified', 'identity_verified') then
    raise exception 'Ownership and identity can''t be waived.' using errcode = '23514';
  end if;

  -- the owner and the public page show this note next to "Waived" or "Needs attention"
  if status in ('waived', 'flagged') and public_note is null then
    raise exception 'Add a public note saying why.' using errcode = '23514';
  end if;

  if checkpoint_key = 'identity_verified' and status = 'verified'
     and not exists (
       select 1 from public.identity_documents
       where identity_documents.profile_id = property.submitted_by
         and identity_documents.verification_status = 'verified'
     ) then
    raise exception 'Verify the owner''s identity document first.' using errcode = '23514';
  end if;

  update public.property_checkpoints
  set status = update_checkpoint.status,
      public_notes = public_note,
      internal_notes = internal_note,
      verified_by = case when update_checkpoint.status = 'verified' then caller end,
      verified_at = case when update_checkpoint.status = 'verified' then now() end,
      updated_at = now()
  where id = existing.id;

  -- the notes go in the log too, because the row keeps only the latest ones
  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    update_checkpoint.property_id,
    'checkpoint_updated',
    jsonb_build_object(
      'checkpoint_key', checkpoint_key,
      'old_status', existing.status,
      'new_status', status,
      'public_note', public_note,
      'internal_note', internal_note
    )
  );
end;
$$;

revoke all on function public.start_review(uuid) from public, anon;
revoke all on function public.update_checkpoint(uuid, text, text, text, text) from public, anon;
grant execute on function public.start_review(uuid) to authenticated;
grant execute on function public.update_checkpoint(uuid, text, text, text, text) to authenticated;
