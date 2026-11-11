-- the public record of a verified property (docs/architecture.md, "public property page"; MVP acceptance criteria:
-- "buyer/public view exposes only approved public information"). anyone with the link can read it, signed in or not,
-- through this one function, which returns a deliberately chosen projection: what the property is, roughly where,
-- that it is verified and what was checked. never the owner, their documents, the exact address, the boundary, or
-- anything an admin wrote for themselves.
--
-- a property is on the record only once it has been verified, and stays there, marked "not currently verified", while
-- suspended (docs/admin.md, decision 7), unless its visibility is private. its reference, PROP- and six random letters
-- and digits, is the address; there is nothing to list or search.
create or replace function public.public_property_record(reference text)
returns table (
  prop_id text,
  name text,
  property_type text,
  city_town text,
  district_municipality text,
  region text,
  area_sqm numeric,
  status text,
  verified_at timestamptz,
  checkpoints jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    properties.prop_id,
    properties.name,
    properties.property_type,
    properties.city_town,
    properties.district_municipality,
    properties.region,
    -- the size of the mapped boundary, rounded: the shape itself isn't public
    round((select property_boundaries.area_sqm from public.property_boundaries where property_boundaries.property_id = properties.id)),
    properties.status,
    -- when it was last approved; a suspended property shows no date
    case when properties.status = 'active' then (
      select max(audit_logs.created_at) from public.audit_logs
      where audit_logs.property_id = properties.id and audit_logs.action = 'property_approved'
    ) end,
    -- what was checked, with the note admins write for the owner and the public. internal notes and who checked
    -- them stay out. a suspended property shows none.
    case when properties.status = 'active' then (
      select jsonb_agg(jsonb_build_object('key', checkpoint_key, 'status', status, 'note', public_notes) order by checkpoint_key)
      from public.property_checkpoints where property_checkpoints.property_id = properties.id
    ) end
  from public.properties
  where properties.prop_id = public_property_record.reference
    and properties.status in ('active', 'suspended')
    and properties.visibility <> 'private'
$$;

revoke all on function public.public_property_record(text) from public;
grant execute on function public.public_property_record(text) to anon, authenticated;

-- the owner is told we have their property as soon as they submit it (MVP: "basic notifications for submission"),
-- and, as before, when we start checking it or check it again. not when they send it back after changes: they did that.
create or replace function public.properties_notify_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'draft' and new.status = 'submitted' then
    insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
    values (
      new.submitted_by,
      'property.submitted',
      'property',
      new.id,
      'We''ve received your property',
      coalesce(new.name, 'Your property') || ' is with us, reference ' || new.prop_id || '. We''ll start checking it soon.',
      '/account/dashboard/properties/' || new.id
    );
  elsif new.status = 'under_review' and old.status in ('submitted', 'suspended', 'active') then
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
