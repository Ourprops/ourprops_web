-- property documents no longer take HEIC photos (docs/admin.md, section 7). the converter is LibreOffice, which can't
-- read them, and browsers can't display them, so an admin could never open one. the app leaves HEIC out of the file
-- input's accept, so iPhones send a JPEG instead.
-- a HEIC already uploaded stays where it is. it is no longer converted, so record_document_preview refuses 'ready'
-- for it, and the admin asks for it again as a PDF or photo through request_changes.

update storage.buckets
  set allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff'
  ]
  where id = 'property-documents';

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
    'image/tiff'
  )
$$;
