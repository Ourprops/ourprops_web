-- lets a user submit their draft for review. users can't change a property's status or slug themselves,
-- so this function does it for them once it has checked the draft is theirs.
-- only what properties_complete_unless_draft requires is checked: a boundary, documents and the other answers
-- may still be missing, and reviewers follow those up.
-- declaration is the statement the user confirmed before submitting, kept in the audit log as the record of it.
drop function if exists public.submit_property(uuid);

create or replace function public.submit_property(draft_id uuid, declaration text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft public.properties;
  base text;
  new_slug text;
begin
  -- security definer skips row level security, so check the draft belongs to the caller.
  -- the row is locked so two submits at once can't both go through.
  select *
  into draft
  from public.properties
  where id = draft_id
    and submitted_by = (select auth.uid())
    and status = 'draft'
  for update;
  if not found then
    raise exception 'Draft not found.' using errcode = 'P0002';
  end if;

  if nullif(trim(declaration), '') is null then
    raise exception 'Confirm that your information is accurate before submitting.' using errcode = '23514';
  end if;

  if draft.name is null or draft.property_type is null or draft.region is null
     or draft.city_town is null or draft.acquisition_method is null then
    raise exception 'Add the property''s name, type, region, city and how you got it before submitting.'
      using errcode = '23514';
  end if;

  -- the slug is the name in lowercase with dashes, plus the start of the id so two properties with the same name differ
  base := left(trim(both '-' from regexp_replace(lower(draft.name), '[^a-z0-9]+', '-', 'g')), 60);
  new_slug := coalesce(nullif(base, ''), 'property') || '-' || left(replace(draft.id::text, '-', ''), 8);

  update public.properties
  set status = 'submitted',
      slug = new_slug
  where id = draft_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values ((select auth.uid()), draft_id, 'property_submitted', jsonb_build_object('declaration', declaration));

  return new_slug;
end;
$$;

revoke all on function public.submit_property(uuid, text) from public, anon;
grant execute on function public.submit_property(uuid, text) to authenticated;
