-- let users mark a draft property on the map, either by drawing its boundary or by dropping a pin on it

-- the overlap trigger on property_boundaries compares every property's boundary, which a signed-in user can't see,
-- so users only read their own rows and save through save_draft_boundary below
revoke all on table public.property_boundaries from anon;
-- truncate ignores row level security, so it is removed along with the write privileges
revoke insert, update, delete, truncate, references, trigger, maintain on table public.property_boundaries from authenticated;

drop policy if exists "property_boundaries_select_own" on public.property_boundaries;
create policy "property_boundaries_select_own"
  on public.property_boundaries
  for select
  to authenticated
  using (exists (
    select 1
    from public.properties
    where properties.id = property_boundaries.property_id
      and properties.submitted_by = (select auth.uid())
  ));

-- saves what the user marked on their draft, given as a GeoJSON Polygon (the boundary) or Point (the pin).
-- null removes it, for when the user clears the map.
-- source says whether the user drew it on the map or uploaded it as a GeoJSON file; the other sources are set by reviewers.
create or replace function public.save_draft_boundary(draft_id uuid, boundary jsonb, source text default 'manual_draw')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shape public.geometry;
begin
  -- security definer skips row level security, so check the draft belongs to the caller
  perform 1
  from public.properties
  where id = draft_id
    and submitted_by = (select auth.uid())
    and status = 'draft';
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
$$;

revoke all on function public.save_draft_boundary(uuid, jsonb, text) from public, anon;
grant execute on function public.save_draft_boundary(uuid, jsonb, text) to authenticated;
