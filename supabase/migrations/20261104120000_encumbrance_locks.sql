-- record_encumbrance and update_encumbrance now lock the property row, as the other review functions do.
-- without it, approve_property could check for blocking encumbrances, find none, and make the property active
-- while an admin was recording a blocking one, or reopening one, at the same moment. with both locking the
-- property, one waits for the other: either approval sees the encumbrance, or the encumbrance is recorded on a
-- property that is already active, where the admin can see it and suspend.
-- the property is locked before the encumbrance, in the same order as approve_property, so they can't deadlock.

create or replace function public.record_encumbrance(
  property_id uuid,
  kind text,
  reference text,
  blocks_activation boolean,
  note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property_status text;
  saved_id uuid;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can record encumbrances.' using errcode = '42501';
  end if;

  if blocks_activation is null then
    raise exception 'Say whether this encumbrance blocks activation.' using errcode = '23502';
  end if;

  select properties.status into property_status
  from public.properties
  where properties.id = record_encumbrance.property_id
  for update;

  if not found then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property_status = 'draft' then
    raise exception 'This property is still a draft.' using errcode = '23514';
  end if;

  insert into public.property_encumbrances (property_id, kind, reference, blocks_activation, internal_notes, recorded_by)
  values (record_encumbrance.property_id, kind, trim(reference), blocks_activation, nullif(trim(note), ''), caller)
  returning id into saved_id;

  -- the reference and note stay out of the log; the record holds them
  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    record_encumbrance.property_id,
    'encumbrance_recorded',
    jsonb_build_object('encumbrance_id', saved_id, 'kind', kind, 'blocks_activation', blocks_activation)
  );

  return saved_id;
end;
$$;

create or replace function public.update_encumbrance(
  encumbrance_id uuid,
  blocks_activation boolean,
  status text,
  note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  existing public.property_encumbrances;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can change encumbrances.' using errcode = '42501';
  end if;

  if nullif(trim(note), '') is null then
    raise exception 'Give a reason for the change.' using errcode = '23514';
  end if;

  if blocks_activation is null or status is null then
    raise exception 'Say whether it blocks activation and whether it is open or resolved.' using errcode = '23502';
  end if;

  -- the property first, then the encumbrance. an encumbrance never moves to another property, so reading its
  -- property_id before locking is safe.
  perform 1
  from public.properties
  where properties.id = (select e.property_id from public.property_encumbrances e where e.id = encumbrance_id)
  for update;

  -- locked so two admins changing it at once can't both go through
  select * into existing
  from public.property_encumbrances
  where id = encumbrance_id
  for update;

  if not found then
    raise exception 'Encumbrance not found.' using errcode = 'P0002';
  end if;

  update public.property_encumbrances
    set blocks_activation = update_encumbrance.blocks_activation,
        status = update_encumbrance.status,
        resolved_by = case when update_encumbrance.status = 'resolved' then coalesce(existing.resolved_by, caller) end,
        resolved_at = case when update_encumbrance.status = 'resolved' then coalesce(existing.resolved_at, now()) end
    where id = encumbrance_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    existing.property_id,
    'encumbrance_updated',
    jsonb_build_object(
      'encumbrance_id', encumbrance_id,
      'old_status', existing.status,
      'new_status', status,
      'old_blocks_activation', existing.blocks_activation,
      'new_blocks_activation', blocks_activation,
      'reason', trim(note)
    )
  );
end;
$$;
