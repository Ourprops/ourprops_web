-- the document a user proves who they are with: a Ghana Card, or a passport for owners abroad who don't have one.
-- each user has at most one, used for every property they register, and an admin checks the name on it
-- against the profile and the ownership documents (the identity_verified checkpoint).
-- this replaces ghana_card_records, which only fitted Ghana Cards and was never used.

-- refuse rather than lose data if anything was ever saved to the old table
do $$
begin
  if exists (select 1 from public.ghana_card_records) then
    raise exception 'ghana_card_records has rows; move them to identity_documents before dropping it.';
  end if;
end;
$$;

drop table public.ghana_card_records;

create table public.identity_documents (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        not null unique references public.profiles(id) on delete cascade,
  document_type       text        not null,
  -- ISO 3166-1 two-letter code of the country that issued the document
  issuing_country     text        not null,
  -- stored in capitals without spaces, so the same number typed two ways is still one number
  document_number     text        not null,
  expires_on          date        not null,
  -- the photo or scan, at {profile_id}/{file name} in the identity-documents bucket
  file_path           text        not null,
  verification_status text        not null default 'unreviewed',
  -- why a document was rejected, shown to the owner so they know what to send instead
  review_note         text,
  verified_by         uuid        references public.profiles(id),
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint identity_documents_document_type_check check (document_type in ('ghana_card', 'passport')),
  constraint identity_documents_issuing_country_check check (issuing_country ~ '^[A-Z]{2}$'),
  -- every Ghana Card, including a non-citizen's, is issued by Ghana
  constraint identity_documents_ghana_card_country_check check (document_type <> 'ghana_card' or issuing_country = 'GH'),
  -- the exact Ghana Card format is checked by the app; this only keeps out spaces and stray characters
  constraint identity_documents_document_number_check check (document_number ~ '^[A-Z0-9-]{5,30}$'),
  constraint identity_documents_verification_status_check check (verification_status in ('unreviewed', 'verified', 'rejected')),
  -- one document can't prove the identity of two accounts
  constraint identity_documents_number_key unique (document_type, issuing_country, document_number)
);

alter table public.identity_documents enable row level security;

create index idx_identity_documents_verified_by on public.identity_documents (verified_by);

create or replace function public.identity_documents_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger identity_documents_set_updated_at
  before update on public.identity_documents
  for each row
  execute function public.identity_documents_set_updated_at();

-- users can read their own document and nothing else. they never write the table directly:
-- save_identity_document does it, so nobody can mark their own document verified.
-- admin access is added with the admin console's staff_role().
revoke all on table public.identity_documents from anon, authenticated;
grant select on table public.identity_documents to authenticated;

create policy "identity_documents_select_own"
  on public.identity_documents
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

-- a private bucket for the photos and scans. photos are what most people will send, from a phone camera.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-documents',
  'identity-documents',
  false,
  10 * 1024 * 1024,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- the user a file in the bucket belongs to, read from the first folder of its path.
-- null when the path isn't {profile_id}/{file name}, so the policies below refuse it.
create or replace function public.identity_document_profile_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when object_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    then split_part(object_name, '/', 1)::uuid
  end
$$;

-- users can upload into and read their own folder only.
-- there is no update policy, so a stored file can't be overwritten: a replacement is a new file.
-- users can delete their own files except the one their saved document points to,
-- so the old photo can be removed once a new one is saved.
drop policy if exists "identity_documents_select_own" on storage.objects;
create policy "identity_documents_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'identity-documents'
    and public.identity_document_profile_id(objects.name) = (select auth.uid())
  );

drop policy if exists "identity_documents_insert_own" on storage.objects;
create policy "identity_documents_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'identity-documents'
    and public.identity_document_profile_id(objects.name) = (select auth.uid())
  );

drop policy if exists "identity_documents_delete_own_unused" on storage.objects;
create policy "identity_documents_delete_own_unused"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'identity-documents'
    and public.identity_document_profile_id(objects.name) = (select auth.uid())
    and not exists (
      select 1
      from public.identity_documents
      where identity_documents.file_path = objects.name
    )
  );

-- saves the caller's identity document, or replaces it while it is not yet verified.
-- replacing it sends it back for review. once verified it can't be changed here; an admin has to reopen it.
-- the document number never goes in the audit log, only what kind of document it was.
create or replace function public.save_identity_document(
  document_type text,
  issuing_country text,
  document_number text,
  expires_on date,
  file_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  existing public.identity_documents;
  replacing boolean;
  saved_id uuid;
begin
  if caller is null then
    raise exception 'Sign in to add your identity document.' using errcode = '42501';
  end if;

  -- a Ghana Card is always issued by Ghana, so the app doesn't have to ask
  if document_type = 'ghana_card' then
    issuing_country := 'GH';
  end if;
  issuing_country := upper(trim(issuing_country));
  document_number := upper(regexp_replace(document_number, '\s', '', 'g'));

  if expires_on is null or expires_on <= current_date then
    raise exception 'This document has expired. Add one that is still valid.' using errcode = '23514';
  end if;

  -- security definer skips row level security, so check the file is in the caller's own folder and was uploaded
  if public.identity_document_profile_id(file_path) is distinct from caller
     or not exists (
       select 1 from storage.objects
       where objects.bucket_id = 'identity-documents' and objects.name = save_identity_document.file_path
     ) then
    raise exception 'Upload a photo or scan of the document first.' using errcode = 'P0002';
  end if;

  -- locked so two saves at once can't both go through
  select * into existing
  from public.identity_documents
  where profile_id = caller
  for update;
  replacing := found;

  if replacing and existing.verification_status = 'verified' then
    raise exception 'Your identity is already verified. Contact us to change your document.' using errcode = '23514';
  end if;

  begin
    insert into public.identity_documents (profile_id, document_type, issuing_country, document_number, expires_on, file_path)
    values (caller, document_type, issuing_country, document_number, expires_on, file_path)
    on conflict (profile_id) do update
      set document_type = excluded.document_type,
          issuing_country = excluded.issuing_country,
          document_number = excluded.document_number,
          expires_on = excluded.expires_on,
          file_path = excluded.file_path,
          verification_status = 'unreviewed',
          review_note = null,
          verified_by = null,
          verified_at = null
    returning id into saved_id;
  exception
    when unique_violation then
      raise exception 'This document is already linked to another account. Contact us if it is yours.'
        using errcode = '23505';
  end;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    null,
    'identity_document_saved',
    jsonb_build_object('document_type', document_type, 'issuing_country', issuing_country, 'replaced', replacing)
  );

  return saved_id;
end;
$$;

revoke all on function public.save_identity_document(text, text, text, date, text) from public, anon;
grant execute on function public.save_identity_document(text, text, text, date, text) to authenticated;
