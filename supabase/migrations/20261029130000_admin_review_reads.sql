-- what the admin console reads (docs/admin.md, sections 4 and 8). admins read with their own session, so each
-- table gets a select policy that checks staff_role(), which needs a second factor that still exists.
-- reads only: every change goes through a security definer function that checks the role and writes audit_logs.
-- the property-documents storage policy waits for document safety (section 7), so admins can't open files yet.

-- tables owners already read their own rows of. the admin policy adds to theirs: postgres allows a row
-- when any select policy does.
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using ((select public.staff_role()) = 'admin');

-- drafts stay private to their owner until they are submitted
drop policy if exists "properties_select_admin" on public.properties;
create policy "properties_select_admin"
  on public.properties
  for select
  to authenticated
  using ((select public.staff_role()) = 'admin' and status <> 'draft');

drop policy if exists "property_boundaries_select_admin" on public.property_boundaries;
create policy "property_boundaries_select_admin"
  on public.property_boundaries
  for select
  to authenticated
  using (
    (select public.staff_role()) = 'admin'
    and exists (
      select 1 from public.properties
      where properties.id = property_boundaries.property_id
        and properties.status <> 'draft'
    )
  );

drop policy if exists "property_documents_select_admin" on public.property_documents;
create policy "property_documents_select_admin"
  on public.property_documents
  for select
  to authenticated
  using (
    (select public.staff_role()) = 'admin'
    and exists (
      select 1 from public.properties
      where properties.id = property_documents.property_id
        and properties.status <> 'draft'
    )
  );

drop policy if exists "identity_documents_select_admin" on public.identity_documents;
create policy "identity_documents_select_admin"
  on public.identity_documents
  for select
  to authenticated
  using ((select public.staff_role()) = 'admin');

-- tables closed to users until now (20261019120000_revoke_unused_table_grants.sql). select comes back for
-- signed-in users only, and the policy limits it to admins: owners still read nothing from them.
-- owners will read their checkpoints through a function that leaves out internal_notes, as with encumbrances.
grant select on table public.property_checkpoints to authenticated;
grant select on table public.property_overlap_flags to authenticated;
grant select on table public.audit_logs to authenticated;

drop policy if exists "property_checkpoints_select_admin" on public.property_checkpoints;
create policy "property_checkpoints_select_admin"
  on public.property_checkpoints
  for select
  to authenticated
  using ((select public.staff_role()) = 'admin');

-- the overlap trigger also runs while owners draw drafts, so a flag can point at a draft.
-- admins see a flag only once both properties are submitted, so drafts stay private to their owners.
drop policy if exists "property_overlap_flags_select_admin" on public.property_overlap_flags;
create policy "property_overlap_flags_select_admin"
  on public.property_overlap_flags
  for select
  to authenticated
  using (
    (select public.staff_role()) = 'admin'
    and exists (
      select 1 from public.properties
      where properties.id = property_overlap_flags.property_id
        and properties.status <> 'draft'
    )
    and exists (
      select 1 from public.properties
      where properties.id = property_overlap_flags.conflicting_property_id
        and properties.status <> 'draft'
    )
  );

-- nobody can edit or delete an audit entry: there is no update or delete grant, and only functions insert
drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
  on public.audit_logs
  for select
  to authenticated
  using ((select public.staff_role()) = 'admin');
