-- the area a property's site plan states, recorded by an admin at the "survey records" check (cadastral_cross_check).
--
-- until now the public record showed the area of the boundary the owner drew on a satellite map: a fair sketch, often
-- 10-20% out, and nothing on the record said so. from here the record shows the site plan's area, once an admin has
-- recorded it and verified the survey check, and otherwise the owner's drawing, labelled as such (area_source).
--
-- only admins write it, through record_site_plan_area(): owners update properties column by column
-- (20261013140000_property_drafts.sql), and this column isn't granted to them.
alter table public.properties
  add column site_plan_area_sqm numeric
    constraint properties_site_plan_area_sqm_check check (site_plan_area_sqm > 0 and site_plan_area_sqm < 1000000000);

comment on column public.properties.site_plan_area_sqm is
  'The area stated on the site plan, in square metres, recorded by an admin during review. Set with record_site_plan_area().';

-- records (or clears, with null) the site plan's area while the property is in review, and logs it
create or replace function public.record_site_plan_area(property_id uuid, area_sqm numeric)
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
    raise exception 'Only admins can record the site plan area.' using errcode = '42501';
  end if;

  if area_sqm is not null and (area_sqm <= 0 or area_sqm >= 1000000000) then
    raise exception 'Enter the area shown on the site plan.' using errcode = '23514';
  end if;

  select * into property
  from public.properties
  where id = record_site_plan_area.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  -- as with checkpoints: changed only in review; a verified property goes back through reopen_review first
  if property.status <> 'under_review' then
    raise exception 'The site plan area can be changed only while the property is in review.' using errcode = '23514';
  end if;

  -- clearing it would leave a verified survey check with nothing behind it
  if area_sqm is null and exists (
    select 1 from public.property_checkpoints
    where property_checkpoints.property_id = record_site_plan_area.property_id
      and checkpoint_key = 'cadastral_cross_check' and status = 'verified'
  ) then
    raise exception 'Change the survey records check from verified before clearing the area.' using errcode = '23514';
  end if;

  update public.properties
  set site_plan_area_sqm = record_site_plan_area.area_sqm,
      updated_at = now()
  where id = property.id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    property.id,
    'site_plan_area_recorded',
    jsonb_build_object('old_area_sqm', property.site_plan_area_sqm, 'new_area_sqm', area_sqm)
  );
end;
$$;

revoke all on function public.record_site_plan_area(uuid, numeric) from public, anon;
grant execute on function public.record_site_plan_area(uuid, numeric) to authenticated;

-- update_checkpoint as in 20261029140000_start_review_update_checkpoint.sql, with one more rule: the survey records
-- check can be verified only once the site plan's area is recorded, so a verified record always has a checked area.
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

  -- new: the public record shows this area as checked, so it has to be there
  if checkpoint_key = 'cadastral_cross_check' and status = 'verified' and property.site_plan_area_sqm is null then
    raise exception 'Record the area shown on the site plan first.' using errcode = '23514';
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

-- public_property_record as in 20261109130000_public_record.sql, plus where its area comes from. Its columns change,
-- so it is dropped and created again rather than replaced, with the same grants.
drop function public.public_property_record(text);

create function public.public_property_record(reference text)
returns table (
  prop_id text,
  name text,
  property_type text,
  city_town text,
  district_municipality text,
  region text,
  area_sqm numeric,
  -- 'site_plan': stated on the site plan and checked by an admin. 'owner_map': the boundary the owner drew, not checked.
  area_source text,
  status text,
  verified_at timestamptz,
  checkpoints jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with record as (
    select
      properties.*,
      -- the site plan's area counts once the survey check is verified and the property is verified
      (properties.status = 'active' and properties.site_plan_area_sqm is not null and exists (
        select 1 from public.property_checkpoints
        where property_checkpoints.property_id = properties.id
          and checkpoint_key = 'cadastral_cross_check' and property_checkpoints.status = 'verified'
      )) as site_plan_checked,
      (select property_boundaries.area_sqm from public.property_boundaries where property_boundaries.property_id = properties.id) as drawn_area_sqm
    from public.properties
    where properties.prop_id = public_property_record.reference
      and properties.status in ('active', 'suspended')
      and properties.visibility <> 'private'
  )
  select
    record.prop_id,
    record.name,
    record.property_type,
    record.city_town,
    record.district_municipality,
    record.region,
    -- rounded to a whole square metre: the shape itself isn't public
    round(case when record.site_plan_checked then record.site_plan_area_sqm else record.drawn_area_sqm end),
    case
      when record.site_plan_checked then 'site_plan'
      when record.drawn_area_sqm is not null then 'owner_map'
    end,
    record.status,
    -- when it was last approved; a suspended property shows no date
    case when record.status = 'active' then (
      select max(audit_logs.created_at) from public.audit_logs
      where audit_logs.property_id = record.id and audit_logs.action = 'property_approved'
    ) end,
    -- what was checked, with the note admins write for the owner and the public. internal notes and who checked
    -- them stay out. a suspended property shows none.
    case when record.status = 'active' then (
      select jsonb_agg(jsonb_build_object('key', checkpoint_key, 'status', status, 'note', public_notes) order by checkpoint_key)
      from public.property_checkpoints where property_checkpoints.property_id = record.id
    ) end
  from record
$$;

revoke all on function public.public_property_record(text) from public;
grant execute on function public.public_property_record(text) to anon, authenticated;
