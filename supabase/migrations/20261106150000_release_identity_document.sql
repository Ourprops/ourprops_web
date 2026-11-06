-- identity documents, a number already on another account (docs/admin.md, section 5; build order step 6). an owner
-- whose card is refused because another account holds it contacts us; once they prove it is theirs, an admin finds
-- the account holding it and releases the document from it.
--
-- verified documents no longer store their numbers, so the holder can only be found by fingerprint, which only the
-- database can make. find_identity_document_holder does that for admins, and audits every lookup, found or not:
-- trying numbers one by one to see who holds them leaves a trail.

-- the account holding a document, looked up by its number. the number is normalised as save_identity_document
-- normalises it, so the same card typed another way is still found. returns no row when no account holds it.
create or replace function public.find_identity_document_holder(
  document_type text,
  issuing_country text,
  document_number text
)
returns table (
  profile_id uuid,
  full_name text,
  email text,
  phone_number text,
  verification_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  fingerprint text;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can look up identity documents.' using errcode = '42501';
  end if;

  if document_type is null or document_type not in ('ghana_card', 'passport') then
    raise exception 'Choose a Ghana Card or a passport.' using errcode = '23514';
  end if;

  if document_type = 'ghana_card' then
    issuing_country := 'GH';
  end if;
  issuing_country := upper(trim(issuing_country));
  document_number := upper(regexp_replace(coalesce(document_number, ''), '\s', '', 'g'));

  if document_number = '' or issuing_country !~ '^[A-Z]{2}$' then
    raise exception 'Enter the document''s country and number.' using errcode = '23514';
  end if;

  fingerprint := public.identity_number_fingerprint(document_type, issuing_country, document_number);

  return query
    select identity_documents.profile_id, profiles.full_name, users.email::text, profiles.phone_number,
           identity_documents.verification_status
    from public.identity_documents
    join public.profiles on profiles.id = identity_documents.profile_id
    left join auth.users on users.id = identity_documents.profile_id
    where identity_documents.document_number_hmac = fingerprint;

  -- the kind of document and whether it was found, never the number
  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    null,
    'identity_document_looked_up',
    jsonb_build_object(
      'document_type', document_type,
      'issuing_country', issuing_country,
      'found_profile_id', (select identity_documents.profile_id from public.identity_documents
                           where identity_documents.document_number_hmac = fingerprint)
    )
  );
end;
$$;

revoke all on function public.find_identity_document_holder(text, text, text) from public, anon;
grant execute on function public.find_identity_document_holder(text, text, text) to authenticated;

-- removes an account's identity document so its rightful owner can save it. a reason is required and audited.
-- if the document was verified, the account loses its verified identity: every identity_verified checkpoint on its
-- properties goes back to unverified, and its active properties go back to review, as reopen_review would, because
-- they were approved on an identity that turned out not to be theirs.
-- returns the path of the photo still in storage, if any, for the server action to delete: with the row gone, no
-- admin policy covers the file.
create or replace function public.release_identity_document(profile_id uuid, reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  existing public.identity_documents;
  reopened uuid;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can release identity documents.' using errcode = '42501';
  end if;

  reason := nullif(trim(reason), '');

  if reason is null then
    raise exception 'Say why the document is released, for example how the owner proved it is theirs.' using errcode = '23514';
  end if;

  select * into existing
  from public.identity_documents
  where identity_documents.profile_id = release_identity_document.profile_id
  for update;

  if not found then
    raise exception 'Identity document not found.' using errcode = 'P0002';
  end if;

  delete from public.identity_documents
  where identity_documents.profile_id = release_identity_document.profile_id;

  if existing.verification_status = 'verified' then
    -- every property of the account, whatever its status: none of them has a verified owner any more
    update public.property_checkpoints
    set status = 'unverified',
        verified_by = null,
        verified_at = null,
        public_notes = null,
        updated_at = now()
    where checkpoint_key = 'identity_verified'
      and property_id in (
        select properties.id from public.properties
        where properties.submitted_by = release_identity_document.profile_id
      );

    -- each active property back to review, audited as reopen_review audits it. the status is checked again by the
    -- update itself, so a property approved a moment ago, under its own lock, is caught too.
    for reopened in
      update public.properties
      set status = 'under_review'
      where properties.submitted_by = release_identity_document.profile_id
        and properties.status = 'active'
      returning properties.id
    loop
      insert into public.audit_logs (actor_id, property_id, action, metadata)
      values (
        caller,
        reopened,
        'review_reopened',
        jsonb_build_object('checkpoints', jsonb_build_array('identity_verified'), 'note', 'Identity document released: ' || reason)
      );
    end loop;
  end if;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    null,
    'identity_document_released',
    jsonb_build_object(
      'profile_id', existing.profile_id,
      'document_type', existing.document_type,
      'issuing_country', existing.issuing_country,
      'was_verified', existing.verification_status = 'verified',
      'reason', reason
    )
  );

  return existing.file_path;
end;
$$;

revoke all on function public.release_identity_document(uuid, text) from public, anon;
grant execute on function public.release_identity_document(uuid, text) to authenticated;
