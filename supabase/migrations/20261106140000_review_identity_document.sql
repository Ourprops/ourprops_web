-- identity documents, the review (docs/admin.md, section 5, "Identity documents"; build order step 6): an admin
-- verifies or rejects an owner's document, and a verified document's number and photo are deleted.
--
-- the photo can't be deleted in SQL (Supabase's protect_objects_delete refuses deletes from storage.objects), so it
-- takes three steps, and the database never says a photo is gone while it isn't:
--   1. review_identity_document marks the document verified and clears the number, in one transaction;
--   2. the admin's server action deletes the photo through the Storage API, which the policy below allows only for
--      a verified document;
--   3. forget_identity_photo clears file_path, and only once the file is no longer in storage.
-- if step 2 fails, the document is verified with its photo still listed, and the console offers to try again.

-- documents verified before this migration, by hand, lose their numbers now. their photos are cleared through the
-- console like any other.
update public.identity_documents set document_number = null
  where verification_status = 'verified' and document_number is not null;

-- a verified document never keeps its number
alter table public.identity_documents
  add constraint identity_documents_number_cleared_check
    check (verification_status <> 'verified' or document_number is null);

-- an admin reads a photo waiting for review, of an owner with a property out of draft, and only if it was stored as
-- something the browser shows safely. a verified document's photo stays readable until it is deleted, because
-- postgres only lets a delete remove rows the caller can see, and the Storage API's delete is no exception; the
-- console doesn't link to it. a rejected one isn't readable: it waits for the owner to replace it.
drop policy if exists "identity_documents_select_admin" on storage.objects;
create policy "identity_documents_select_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'identity-documents'
    and (select public.staff_role()) = 'admin'
    and public.document_is_viewable(objects.metadata ->> 'mimetype')
    and exists (
      select 1
      from public.identity_documents
      join public.properties on properties.submitted_by = identity_documents.profile_id
      where identity_documents.file_path = objects.name
        and identity_documents.verification_status in ('unreviewed', 'verified')
        and properties.status <> 'draft'
    )
  );

-- an admin deletes a verified document's photo, and nothing else in the bucket
drop policy if exists "identity_documents_delete_admin_verified" on storage.objects;
create policy "identity_documents_delete_admin_verified"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'identity-documents'
    and (select public.staff_role()) = 'admin'
    and exists (
      select 1 from public.identity_documents
      where identity_documents.file_path = objects.name
        and identity_documents.verification_status = 'verified'
    )
  );

-- verifies or rejects an owner's identity document. only one waiting for review: a verified one has nothing left to
-- look at, and a rejected one is reviewed again once the owner replaces it.
-- verifying clears the number at once; the photo goes through the server action and forget_identity_photo.
-- rejecting needs a note, which the owner sees; the photo stays until the owner replaces it.
-- the audit log records the kind of document and the outcome, never the number.
create or replace function public.review_identity_document(
  profile_id uuid,
  verification_status text,
  note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  existing public.identity_documents;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can review identity documents.' using errcode = '42501';
  end if;

  note := nullif(trim(note), '');

  if verification_status is null or verification_status not in ('verified', 'rejected') then
    raise exception 'Choose verified or rejected.' using errcode = '23514';
  end if;

  if verification_status = 'rejected' and note is null then
    raise exception 'Say why, so the owner knows what to send instead.' using errcode = '23514';
  end if;

  -- locked so two admins can't review it at once, and the owner can't replace it mid-review
  select * into existing
  from public.identity_documents
  where identity_documents.profile_id = review_identity_document.profile_id
  for update;

  if not found then
    raise exception 'Identity document not found.' using errcode = 'P0002';
  end if;

  if existing.verification_status <> 'unreviewed' then
    raise exception 'This identity document has already been reviewed.' using errcode = '23514';
  end if;

  if verification_status = 'verified' and existing.expires_on <= current_date then
    raise exception 'This document has expired, so it can''t be verified. Reject it and ask for one that is still valid.'
      using errcode = '23514';
  end if;

  update public.identity_documents
  set verification_status = review_identity_document.verification_status,
      review_note = note,
      verified_by = case when review_identity_document.verification_status = 'verified' then caller end,
      verified_at = case when review_identity_document.verification_status = 'verified' then now() end,
      document_number = case when review_identity_document.verification_status = 'verified' then null else document_number end
  where identity_documents.profile_id = review_identity_document.profile_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    null,
    'identity_document_reviewed',
    jsonb_build_object(
      'profile_id', existing.profile_id,
      'document_type', existing.document_type,
      'issuing_country', existing.issuing_country,
      'verification_status', verification_status
    )
  );
end;
$$;

revoke all on function public.review_identity_document(uuid, text, text) from public, anon;
grant execute on function public.review_identity_document(uuid, text, text) to authenticated;

-- the last step of deleting a verified document's photo: clears file_path once the file is gone from storage.
-- refuses while it is still there, so the database can't claim a deletion that didn't happen.
create or replace function public.forget_identity_photo(profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  existing public.identity_documents;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can delete identity photos.' using errcode = '42501';
  end if;

  select * into existing
  from public.identity_documents
  where identity_documents.profile_id = forget_identity_photo.profile_id
  for update;

  if not found or existing.verification_status <> 'verified' or existing.file_path is null then
    raise exception 'There is no verified photo to delete.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from storage.objects
    where objects.bucket_id = 'identity-documents' and objects.name = existing.file_path
  ) then
    raise exception 'The photo is still in storage. Try again.' using errcode = '23514';
  end if;

  update public.identity_documents set file_path = null
  where identity_documents.profile_id = forget_identity_photo.profile_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (caller, null, 'identity_photo_deleted', jsonb_build_object('profile_id', existing.profile_id));
end;
$$;

revoke all on function public.forget_identity_photo(uuid) from public, anon;
grant execute on function public.forget_identity_photo(uuid) to authenticated;
