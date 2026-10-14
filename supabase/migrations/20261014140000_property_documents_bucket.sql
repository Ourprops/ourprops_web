-- a private bucket for the documents users upload to prove ownership of a property, such as indentures and site plans.
-- each file is stored at {property_id}/{property_document_id}/{file name}.

-- documents are scans and photos, so only PDFs and images are taken, up to 20 MB each
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-documents',
  'property-documents',
  false,
  20 * 1024 * 1024,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- the property a file in the bucket belongs to, read from the first folder of its path.
-- null when the path isn't {property_id}/{property_document_id}/{file name}, so the policies below refuse it.
create or replace function public.property_document_property_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when object_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    then split_part(object_name, '/', 1)::uuid
  end
$$;

-- signed-out users have no access. signed-in users can read the files of their own properties,
-- and add or remove files only while the property is still a draft.
-- there is no update policy, so a stored file can't be overwritten: a replacement is a new document.
-- reviewers reach every file through the service role, which skips these policies.
drop policy if exists "property_documents_select_own" on storage.objects;
create policy "property_documents_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'property-documents'
    and exists (
      select 1
      from public.properties
      where properties.id = public.property_document_property_id(objects.name)
        and properties.submitted_by = (select auth.uid())
    )
  );

drop policy if exists "property_documents_insert_own_draft" on storage.objects;
create policy "property_documents_insert_own_draft"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-documents'
    and exists (
      select 1
      from public.properties
      where properties.id = public.property_document_property_id(objects.name)
        and properties.submitted_by = (select auth.uid())
        and properties.status = 'draft'
    )
  );

drop policy if exists "property_documents_delete_own_draft" on storage.objects;
create policy "property_documents_delete_own_draft"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'property-documents'
    and exists (
      select 1
      from public.properties
      where properties.id = public.property_document_property_id(objects.name)
        and properties.submitted_by = (select auth.uid())
        and properties.status = 'draft'
    )
  );
