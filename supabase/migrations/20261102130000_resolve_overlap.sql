-- an admin moves an overlap flag to investigating, or resolves it (docs/admin.md, section 5). admin-only,
-- needs a second factor. the boundary trigger creates flags as 'detected'; nothing sends one back there.

-- the flag has no notes column: the note goes in the audit log, once for each property, so both properties'
-- histories show it. owners never read the audit log, so neither learns about the other from it.
create or replace function public.resolve_overlap(
  flag_id uuid,
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
  existing public.property_overlap_flags;
  draft_count int;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can resolve overlaps.' using errcode = '42501';
  end if;

  note := nullif(trim(note), '');

  if status is null or status not in ('investigating', 'resolved_valid', 'resolved_false_positive') then
    raise exception 'Choose investigating, real overlap or not an overlap.' using errcode = '23514';
  end if;

  -- a resolution is what approve_property relies on, so the reason is kept
  if status <> 'investigating' and note is null then
    raise exception 'Add a note saying how it was resolved.' using errcode = '23514';
  end if;

  select * into existing
  from public.property_overlap_flags
  where id = flag_id;

  if not found then
    raise exception 'Overlap not found.' using errcode = 'P0002';
  end if;

  -- both properties are locked, so neither can be approved while the flag changes. always in id order,
  -- so two admins resolving flags between the same properties can't deadlock
  select count(*) filter (where properties.status = 'draft') into draft_count
  from (
    select properties.status
    from public.properties
    where properties.id in (existing.property_id, existing.conflicting_property_id)
    order by properties.id
    for update
  ) as properties;

  -- a flag with a draft on either side looks as if it doesn't exist, as it does to the admin read policy
  if draft_count > 0 then
    raise exception 'Overlap not found.' using errcode = 'P0002';
  end if;

  select * into existing
  from public.property_overlap_flags
  where id = flag_id
  for update;

  update public.property_overlap_flags
  set status = resolve_overlap.status
  where id = flag_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  select
    caller,
    sides.property_id,
    'overlap_updated',
    jsonb_build_object(
      'flag_id', existing.id,
      'other_property_id', sides.other_property_id,
      'old_status', existing.status,
      'new_status', status,
      'note', note
    )
  from (
    values
      (existing.property_id, existing.conflicting_property_id),
      (existing.conflicting_property_id, existing.property_id)
  ) as sides (property_id, other_property_id);
end;
$$;

revoke all on function public.resolve_overlap(uuid, text, text) from public, anon;
grant execute on function public.resolve_overlap(uuid, text, text) to authenticated;
