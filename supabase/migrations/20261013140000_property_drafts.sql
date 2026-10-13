-- let a property be saved as a draft while the user is still registering it,
-- and let signed-in users manage their own drafts directly

-- a draft is created from the first save, before most fields are filled in
alter table public.properties
    alter column name drop not null,
    alter column slug drop not null,
    alter column property_type drop not null,
    alter column ownership_type drop not null,
    alter column ownership_structure drop not null,
    alter column city_town drop not null,
    alter column region drop not null,
    alter column size_value drop not null,
    alter column size_unit drop not null;

-- defaults would show up as answers the user never gave
alter table public.properties
    alter column property_type drop default,
    alter column region drop default;

-- once a property leaves draft, the fields the registration flow collects must be filled in
alter table public.properties
    drop constraint if exists properties_complete_unless_draft;

alter table public.properties
    add constraint properties_complete_unless_draft
    check (
        status = 'draft'
        or (name is not null and slug is not null and property_type is not null and region is not null and city_town is not null)
    );

-- keep updated_at current so the app can show when a draft was last saved
create or replace function public.properties_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row
  execute function public.properties_set_updated_at();

-- signed-out users have no access; signed-in users may only write the fields the registration flow edits.
-- status, slug, visibility and submitted_by changes go through the service role.
revoke all on table public.properties from anon;
-- truncate ignores row level security, so it is removed along with the other privileges the app doesn't need
revoke insert, update, truncate, references, trigger, maintain on table public.properties from authenticated;
grant insert (submitted_by, name, property_type, description, region, district_municipality, city_town, digital_address, landmark, size_value, size_unit, acquisition_method, acquisition_metadata)
  on table public.properties to authenticated;
grant update (name, property_type, description, region, district_municipality, city_town, digital_address, landmark, size_value, size_unit, acquisition_method, acquisition_metadata)
  on table public.properties to authenticated;

drop policy if exists "properties_select_own" on public.properties;
create policy "properties_select_own"
  on public.properties
  for select
  to authenticated
  using ((select auth.uid()) = submitted_by);

drop policy if exists "properties_insert_own_draft" on public.properties;
create policy "properties_insert_own_draft"
  on public.properties
  for insert
  to authenticated
  with check ((select auth.uid()) = submitted_by and status = 'draft');

drop policy if exists "properties_update_own_draft" on public.properties;
create policy "properties_update_own_draft"
  on public.properties
  for update
  to authenticated
  using ((select auth.uid()) = submitted_by and status = 'draft')
  with check ((select auth.uid()) = submitted_by and status = 'draft');

drop policy if exists "properties_delete_own_draft" on public.properties;
create policy "properties_delete_own_draft"
  on public.properties
  for delete
  to authenticated
  using ((select auth.uid()) = submitted_by and status = 'draft');
