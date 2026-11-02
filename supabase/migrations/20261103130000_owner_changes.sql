-- requesting changes, the second part (docs/admin.md, section 5, build order step 5): while an admin has asked for
-- changes, the owner can edit their answers and boundary, as in a draft. resubmit_property records which answers
-- changed since the request and resets the checkpoints whose evidence changed.

-- the owner may change the same columns as in a draft (their column update grant), only while changes are asked
-- for. status isn't among those columns, so they can't move the property out of action_required themselves.
create policy "properties_update_own_action_required"
  on public.properties
  for update
  to authenticated
  using ((select auth.uid()) = submitted_by and status = 'action_required')
  with check ((select auth.uid()) = submitted_by and status = 'action_required');

-- the owner's answers and boundary when changes were requested, to compare with at resubmit. set and cleared by
-- request_changes and resubmit_property; users hold no update grant on it.
alter table public.properties add column answers_at_request jsonb;

-- everything the owner can change, keyed by name: the answer columns in their update grant and the boundary.
-- only the review functions call it, so users can't.
create or replace function public.property_answers(property_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', properties.name,
    'property_type', properties.property_type,
    'description', properties.description,
    'size_value', properties.size_value,
    'size_unit', properties.size_unit,
    'region', properties.region,
    'district_municipality', properties.district_municipality,
    'city_town', properties.city_town,
    'address', properties.address,
    'digital_address', properties.digital_address,
    'landmark', properties.landmark,
    'acquisition_method', properties.acquisition_method,
    'acquisition_metadata', properties.acquisition_metadata,
    'boundary', property_boundaries.boundary_geojson,
    'boundary_source', property_boundaries.source
  )
  from public.properties
  left join public.property_boundaries on property_boundaries.property_id = properties.id
  where properties.id = property_answers.property_id
$$;

revoke all on function public.property_answers(uuid) from public, anon, authenticated;

-- owners couldn't edit anything before this migration, so a property already waiting on them still has the
-- answers it had when changes were requested
update public.properties
set answers_at_request = public.property_answers(id)
where status = 'action_required';

alter table public.properties add constraint properties_answers_at_request_check
  check ((status = 'action_required') = (answers_at_request is not null)) not valid;

-- unchanged except that a property waiting on the owner can have its boundary changed too
create or replace function public.save_draft_boundary(draft_id uuid, boundary jsonb, source text DEFAULT 'manual_draw'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  shape public.geometry;
begin
  -- security definer skips row level security, so check the property belongs to the caller and they can still
  -- change it: a draft, or a property an admin has asked them to change
  perform 1
  from public.properties
  where id = draft_id
    and submitted_by = (select auth.uid())
    and status in ('draft', 'action_required');
  if not found then
    raise exception 'Draft not found.' using errcode = 'P0002';
  end if;

  if source not in ('manual_draw', 'geojson_import') then
    raise exception 'Unknown boundary source.' using errcode = '22023';
  end if;

  if boundary is null then
    delete from public.property_boundaries where property_id = draft_id;
    if found then
      -- the boundary is part of the draft, so changing it counts as an edit (the trigger sets the time)
      update public.properties set updated_at = now() where id = draft_id;
    end if;
    return;
  end if;

  shape := public.st_setsrid(public.st_geomfromgeojson(boundary), 4326);

  if public.geometrytype(shape) = 'POLYGON' then
    if not public.st_isvalid(shape) then
      raise exception 'The boundary can''t cross over itself.' using errcode = '22023';
    end if;
  elsif public.geometrytype(shape) <> 'POINT' then
    raise exception 'Mark the property with a boundary or a pin.' using errcode = '22023';
  end if;

  insert into public.property_boundaries (property_id, source, boundary_geojson, boundary_polygon, marker_pin)
  values (
    draft_id,
    source,
    boundary,
    case when public.geometrytype(shape) = 'POLYGON' then shape end,
    case when public.geometrytype(shape) = 'POINT' then shape::public.geography end
  )
  on conflict (property_id) do update
    set source = excluded.source,
        boundary_geojson = excluded.boundary_geojson,
        boundary_polygon = excluded.boundary_polygon,
        marker_pin = excluded.marker_pin
    -- every draft save sends the boundary, so leave the row (and the overlap check) alone when it hasn't changed
    where property_boundaries.boundary_geojson is distinct from excluded.boundary_geojson
       or property_boundaries.source is distinct from excluded.source;

  if found then
    update public.properties set updated_at = now() where id = draft_id;
  end if;
end;
$function$;

-- unchanged except that it records the owner's answers when changes are requested
create or replace function public.request_changes(property_id uuid, message text, documents jsonb, identity boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
  slots jsonb;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can request changes.' using errcode = '42501';
  end if;

  message := nullif(trim(message), '');
  documents := coalesce(documents, '[]'::jsonb);
  identity := coalesce(identity, false);

  if message is null then
    raise exception 'Write the message the owner will see.' using errcode = '23514';
  end if;

  if jsonb_typeof(documents) is distinct from 'array' then
    raise exception 'Documents must be a list.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(documents) as requested
    where jsonb_typeof(requested) is distinct from 'object'
       or coalesce(requested ->> 'slot', '') not in ('ownership', 'site_plan', 'supporting')
       or coalesce(trim(requested ->> 'note'), '') = ''
  ) then
    raise exception 'Each document asked for needs a checklist item and a note.' using errcode = '23514';
  end if;

  if exists (
    select 1 from jsonb_array_elements(documents) as requested
    where length(trim(requested ->> 'note')) > 2000
  ) then
    raise exception 'Keep each note to 2,000 characters or fewer.' using errcode = '23514';
  end if;

  -- with no answers to edit yet, there is nothing else the owner could do
  if jsonb_array_length(documents) = 0 and not identity then
    raise exception 'Ask for at least one document, or for the owner''s identity document.' using errcode = '23514';
  end if;

  select * into property
  from public.properties
  where id = request_changes.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'under_review' then
    raise exception 'Changes can be requested only while the property is in review.' using errcode = '23514';
  end if;

  update public.properties
  set status = 'action_required',
      changes_requested_message = message,
      identity_requested = identity,
      answers_at_request = public.property_answers(request_changes.property_id)
  where id = request_changes.property_id;

  insert into public.property_document_requests (property_id, slot, note, requested_by)
  select request_changes.property_id, requested ->> 'slot', trim(requested ->> 'note'), caller
  from jsonb_array_elements(documents) as requested;

  select coalesce(jsonb_agg(requested ->> 'slot'), '[]'::jsonb) into slots
  from jsonb_array_elements(documents) as requested;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    request_changes.property_id,
    'changes_requested',
    jsonb_build_object('message', message, 'slots', slots, 'identity', identity)
  );

  -- the owner's message never names the admin (section 5, "What owners see")
  insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
  values (
    property.submitted_by,
    'property.changes_requested',
    'property',
    request_changes.property_id,
    'We need something from you',
    message,
    '/account/dashboard/properties/' || request_changes.property_id
  );
end;
$$;


-- the owner sends a property back for review once every request has a file in storage, and, if their identity
-- document was asked for, once they have saved one that isn't rejected. each request is fulfilled by the latest
-- document in its slot uploaded since the request; two requests for one slot need two documents.
-- it also records which answers changed since the request and resets the checkpoints that depended on them.
create or replace function public.resubmit_property(property_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
  request record;
  answer uuid;
  used uuid[] := '{}';
  missing int := 0;
  changed text[];
  reset_keys text[] := '{}';
begin
  if caller is null then
    raise exception 'Sign in to send your property back.' using errcode = '42501';
  end if;

  -- another user's property looks as if it doesn't exist
  select * into property
  from public.properties
  where id = resubmit_property.property_id
    and submitted_by = caller
  for update;

  if not found then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'action_required' then
    raise exception 'This property isn''t waiting on anything from you.' using errcode = '23514';
  end if;

  if property.identity_requested and not exists (
    select 1 from public.identity_documents
    where identity_documents.profile_id = caller
      and identity_documents.verification_status in ('unreviewed', 'verified')
  ) then
    raise exception 'Add your identity document first.' using errcode = '23514';
  end if;

  for request in
    select property_document_requests.id, property_document_requests.slot, property_document_requests.created_at
    from public.property_document_requests
    where property_document_requests.property_id = resubmit_property.property_id
      and property_document_requests.fulfilled_at is null
    order by property_document_requests.created_at, property_document_requests.id
    for update
  loop
    select property_documents.id into answer
    from public.property_documents
    where property_documents.property_id = resubmit_property.property_id
      and property_documents.slot = request.slot
      and property_documents.created_at >= request.created_at
      and property_documents.id <> all (used)
      and exists (
        select 1 from storage.objects
        where objects.bucket_id = 'property-documents'
          and objects.name = property_documents.file_path
      )
    order by property_documents.created_at desc, property_documents.id
    limit 1;

    if answer is null then
      missing := missing + 1;
    else
      used := used || answer;
      update public.property_document_requests
      set fulfilled_by_document_id = answer,
          fulfilled_at = now()
      where id = request.id;
    end if;
  end loop;

  -- raising undoes the requests fulfilled above, so nothing is half done
  if missing = 1 then
    raise exception 'Upload the document we asked for first.' using errcode = '23514';
  elsif missing > 1 then
    raise exception 'Upload the % documents we asked for first.', missing using errcode = '23514';
  end if;

  -- which answers changed since the request: names only, never values, so the admin knows what to look at again
  select coalesce(array_agg(answers.key order by answers.key), '{}') into changed
  from jsonb_each(public.property_answers(resubmit_property.property_id)) as answers
  where answers.value is distinct from (property.answers_at_request -> answers.key);

  -- the checkpoints whose evidence changed (docs/admin.md, section 5). identity_verified is never reset:
  -- owners can't change their identity here.
  if changed && array['boundary', 'boundary_source'] then
    reset_keys := reset_keys || array['boundary_mapped', 'cadastral_cross_check', 'overlap_clearance'];
  end if;
  if cardinality(array(select unnest(changed) except select unnest(array['boundary', 'boundary_source']))) > 0 then
    reset_keys := reset_keys || array['ownership_claim_verified', 'official_search_status', 'encumbrance_clearance'];
  end if;

  -- a flagged checkpoint already needs attention, and may be held there by a blocking encumbrance, so it stays
  -- flagged rather than looking merely unchecked
  update public.property_checkpoints
  set status = 'unverified',
      verified_by = null,
      verified_at = null,
      public_notes = null,
      updated_at = now()
  where property_checkpoints.property_id = resubmit_property.property_id
    and property_checkpoints.checkpoint_key = any (reset_keys)
    and property_checkpoints.status <> 'flagged';

  update public.properties
  set status = 'under_review',
      changes_requested_message = null,
      identity_requested = false,
      answers_at_request = null
  where id = resubmit_property.property_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    resubmit_property.property_id,
    'property_resubmitted',
    jsonb_build_object('document_ids', to_jsonb(used), 'changed_fields', to_jsonb(changed), 'reset_checkpoints', to_jsonb(reset_keys))
  );
end;
$$;

