-- document safety (docs/admin.md, section 7, build order step 2), the database part: the first time an admin opens
-- a document, the server checks its first bytes, converts Word, HEIC and TIFF files to PDF, and records the outcome
-- here. admins can open an original only once it has passed the check, and only if the browser can display it.

-- the outcome of the first open. null until then. owners read their own rows, so they could see the status, but
-- nobody writes these columns except record_document_preview: users hold no update grant on them.
-- preview_path is in the property-document-previews bucket, and is set only for files converted to PDF;
-- a PDF or image that passed the check is shown as it is.
alter table public.property_documents
  add column preview_status text,
  add column preview_path text;

alter table public.property_documents
  add constraint property_documents_preview_status_check
    check (preview_status in ('ready', 'failed', 'type_mismatch')),
  add constraint property_documents_preview_path_check
    check (preview_path is null or preview_status = 'ready');

-- what the browser can display safely, and what has to be converted first
create or replace function public.document_is_viewable(mime_type text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
$$;

create or replace function public.document_needs_conversion(mime_type text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select mime_type in (
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'image/heic',
    'image/heif',
    'image/tiff'
  )
$$;

-- converted PDFs live in their own bucket, at {property_id}/{property_document_id}.pdf, so nothing an owner uploads
-- can sit at a preview's path, and the bucket takes nothing but PDFs. converted scans can be larger than the
-- original, so the limit is higher. owners have no policy on it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-document-previews',
  'property-document-previews',
  false,
  50 * 1024 * 1024,
  array['application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- an admin can open an original only when it passed the check and the browser can display it. both the type the
-- owner recorded and the type the file was stored with are checked, as the stored type is what the browser is
-- given. Word, HEIC and TIFF originals stay closed to admins: the server reads them with the service role.
drop policy if exists "property_documents_select_admin_viewable" on storage.objects;
create policy "property_documents_select_admin_viewable"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'property-documents'
    and (select public.staff_role()) = 'admin'
    and public.document_is_viewable(objects.metadata ->> 'mimetype')
    and exists (
      select 1
      from public.property_documents
      join public.properties on properties.id = property_documents.property_id
      where property_documents.file_path = objects.name
        and properties.status <> 'draft'
        and property_documents.preview_status = 'ready'
        and public.document_is_viewable(property_documents.mime_type)
    )
  );

-- an admin reads a converted PDF once it is recorded
drop policy if exists "property_document_previews_select_admin" on storage.objects;
create policy "property_document_previews_select_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'property-document-previews'
    and (select public.staff_role()) = 'admin'
    and exists (
      select 1 from public.property_documents
      where property_documents.preview_path = objects.name
    )
  );

-- an admin's session stores the converted PDF, only at the path for a document that needs converting and hasn't
-- been converted yet. there is no update or delete policy, so a stored preview can't be replaced.
drop policy if exists "property_document_previews_insert_admin" on storage.objects;
create policy "property_document_previews_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-document-previews'
    and (select public.staff_role()) = 'admin'
    and exists (
      select 1
      from public.property_documents
      join public.properties on properties.id = property_documents.property_id
      where objects.name = property_documents.property_id::text || '/' || property_documents.id::text || '.pdf'
        and properties.status <> 'draft'
        and public.document_needs_conversion(property_documents.mime_type)
        and property_documents.preview_status is distinct from 'ready'
        and property_documents.preview_status is distinct from 'type_mismatch'
    )
  );

-- records what happened the first time an admin opened a document. 'failed' can be tried again; 'ready' and
-- 'type_mismatch' are final. a converted document is 'ready' only once its PDF is in storage.
-- a mismatch is audited, as it may be a file made to look like something else; the admin then rejects the document
-- with review_document.
create or replace function public.record_document_preview(
  document_id uuid,
  preview_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  existing public.property_documents;
  property_status text;
  path text;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can record document previews.' using errcode = '42501';
  end if;

  if preview_status is null or preview_status not in ('ready', 'failed', 'type_mismatch') then
    raise exception 'Choose ready, failed or type_mismatch.' using errcode = '23514';
  end if;

  -- locked so two admins opening the same document don't both record it
  select * into existing
  from public.property_documents
  where id = record_document_preview.document_id
  for update;

  select properties.status into property_status
  from public.properties
  where properties.id = existing.property_id;

  if not found or property_status = 'draft' then
    raise exception 'Document not found.' using errcode = 'P0002';
  end if;

  if existing.preview_status in ('ready', 'type_mismatch') then
    raise exception 'This document has already been checked.' using errcode = '23514';
  end if;

  if preview_status = 'ready' then
    if public.document_needs_conversion(existing.mime_type) then
      path := existing.property_id::text || '/' || existing.id::text || '.pdf';

      if not exists (
        select 1 from storage.objects
        where bucket_id = 'property-document-previews' and name = path
      ) then
        raise exception 'The converted PDF isn''t in storage.' using errcode = '23514';
      end if;
    elsif not public.document_is_viewable(existing.mime_type) then
      raise exception 'This type of document can''t be shown.' using errcode = '23514';
    end if;
  end if;

  update public.property_documents
  set preview_status = record_document_preview.preview_status,
      preview_path = path
  where id = record_document_preview.document_id;

  if preview_status = 'type_mismatch' then
    insert into public.audit_logs (actor_id, property_id, action, metadata)
    values (
      caller,
      existing.property_id,
      'document_type_mismatch',
      jsonb_build_object('document_id', existing.id, 'mime_type', existing.mime_type)
    );
  end if;
end;
$$;

revoke all on function public.record_document_preview(uuid, text) from public, anon;
grant execute on function public.record_document_preview(uuid, text) to authenticated;
