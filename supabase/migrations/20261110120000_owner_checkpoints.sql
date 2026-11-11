-- owners see what we're checking on their property, and are told when a check needs attention (decided 2026-11-10).
-- until now a flagged checkpoint reached nobody: owners couldn't read checkpoints, and no notification went out, so a
-- property could sit "being checked" while the owner had no idea anything was wrong. the admin's public note, which a
-- flag requires, is what they now see.

-- the checkpoints of one of the caller's own properties, without internal notes or who checked them. someone else's
-- property, or a draft, returns nothing rather than an error, so it doesn't reveal that the property exists.
create or replace function public.property_checkpoints_for_owner(property_id uuid)
returns table (
  checkpoint_key text,
  status text,
  public_notes text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.checkpoint_key, c.status, c.public_notes, c.updated_at
  from public.property_checkpoints c
  join public.properties p on p.id = c.property_id
  where c.property_id = property_checkpoints_for_owner.property_id
    and p.submitted_by = (select auth.uid())
    and p.status <> 'draft'
$$;

revoke all on function public.property_checkpoints_for_owner(uuid) from public, anon;
grant execute on function public.property_checkpoints_for_owner(uuid) to authenticated;

-- a check becoming flagged is news the owner shouldn't miss: it usually means the property can't be verified until
-- something changes. other changes to a single check aren't sent; the owner sees them on the property page, and hears
-- about verification as a whole at approval. a flag from a blocking encumbrance has no note, so it says we're looking.
create or replace function public.property_checkpoints_notify_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  property public.properties;
  label text;
begin
  select * into property from public.properties where id = new.property_id;

  label := case new.checkpoint_key
    when 'identity_verified' then 'The owner''s identity'
    when 'ownership_claim_verified' then 'The ownership documents'
    when 'boundary_mapped' then 'The boundary'
    when 'cadastral_cross_check' then 'Survey records'
    when 'overlap_clearance' then 'Overlapping claims'
    when 'official_search_status' then 'Lands Commission search'
    when 'encumbrance_clearance' then 'Court cases and charges'
    else 'One of our checks'
  end;

  insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
  values (
    property.submitted_by,
    'checkpoint.flagged',
    'checkpoint',
    new.id,
    'We found something to look into',
    label || ', ' || coalesce(property.name, 'your property') || ': ' || coalesce(new.public_notes, 'Our team is looking into it, and will tell you if we need anything.'),
    '/account/dashboard/properties/' || new.property_id
  );
  return new;
end;
$$;

revoke all on function public.property_checkpoints_notify_flag() from public, anon, authenticated;

create trigger property_checkpoints_notify_flag
  after update of status on public.property_checkpoints
  for each row
  when (new.status = 'flagged' and old.status is distinct from 'flagged')
  execute function public.property_checkpoints_notify_flag();
