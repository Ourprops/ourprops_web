-- two more review actions (docs/admin.md, section 5): the admin classifies the ownership, and sets each document's
-- final type and outcome. both are admin-only, need a second factor, and work only while the property is in review.

-- why a document was rejected, or anything else the owner should know about it. owners read their own documents'
-- rows, so they see it; nobody writes it except review_document, because users hold no update grant on it.
alter table public.property_documents add column review_note text;

-- sets ownership_type and ownership_structure, which owners never choose. approve_property needs both.
-- it can be changed until approval, so a second look can correct the first.
create or replace function public.classify_property(
  property_id uuid,
  ownership_type text,
  ownership_structure text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can classify properties.' using errcode = '42501';
  end if;

  -- the same values as properties_ownership_type_check and properties_ownership_structure_check,
  -- checked here so the admin gets a sentence rather than a constraint name
  if ownership_type is null
     or ownership_type not in ('customary_family', 'stool_sublease', 'state_lease', 'private_freehold') then
    raise exception 'Choose an ownership type.' using errcode = '23514';
  end if;

  if ownership_structure is null or ownership_structure not in ('sole', 'co_owned', 'company') then
    raise exception 'Choose an ownership structure.' using errcode = '23514';
  end if;

  -- locked so approve_property can't read the classification while it changes
  select * into property
  from public.properties
  where id = classify_property.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'under_review' then
    raise exception 'The ownership can be classified only while the property is in review.' using errcode = '23514';
  end if;

  update public.properties
  set ownership_type = classify_property.ownership_type,
      ownership_structure = classify_property.ownership_structure
  where id = classify_property.property_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    classify_property.property_id,
    'property_classified',
    jsonb_build_object(
      'old_ownership_type', property.ownership_type,
      'new_ownership_type', ownership_type,
      'old_ownership_structure', property.ownership_structure,
      'new_ownership_structure', ownership_structure
    )
  );
end;
$$;

-- sets a document's final type and its outcome. the owner's slot and declared_type are left as they are,
-- a record of what the owner said. document_type null keeps the type already set.
-- the note is shown to the owner; a rejection needs one, so they know what to send instead.
create or replace function public.review_document(
  document_id uuid,
  document_type text,
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
  existing public.property_documents;
  property_status text;
  final_type text;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can review documents.' using errcode = '42501';
  end if;

  note := nullif(trim(note), '');

  -- 'unreviewed' is where every upload starts, not an outcome
  if verification_status is null or verification_status not in ('accepted', 'rejected', 'superseded') then
    raise exception 'Choose accepted, rejected or superseded.' using errcode = '23514';
  end if;

  select * into existing
  from public.property_documents
  where id = review_document.document_id;

  if not found then
    raise exception 'Document not found.' using errcode = 'P0002';
  end if;

  -- the property is locked before the document, in the same order as approve_property, so approval can't
  -- go through while a document is being reviewed
  select properties.status into property_status
  from public.properties
  where properties.id = existing.property_id
  for update;

  -- a draft's documents look as if they don't exist, as they do to the admin read policy
  if property_status = 'draft' then
    raise exception 'Document not found.' using errcode = 'P0002';
  end if;

  if property_status <> 'under_review' then
    raise exception 'Documents can be reviewed only while the property is in review.' using errcode = '23514';
  end if;

  select * into existing
  from public.property_documents
  where id = review_document.document_id
  for update;

  final_type := coalesce(review_document.document_type, existing.document_type);

  if verification_status = 'accepted' and final_type is null then
    raise exception 'Set the document type before accepting it.' using errcode = '23514';
  end if;

  if verification_status = 'rejected' and note is null then
    raise exception 'Add a note telling the owner why.' using errcode = '23514';
  end if;

  begin
    update public.property_documents
    set document_type = final_type,
        verification_status = review_document.verification_status,
        review_note = note
    where id = review_document.document_id;
  exception
    -- property_documents_document_type_check holds the list; its name means nothing to the admin
    when check_violation then
      raise exception 'Choose a document type from the list.' using errcode = '23514';
  end;

  -- the note goes in the log too, because the row keeps only the latest one
  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    existing.property_id,
    'document_reviewed',
    jsonb_build_object(
      'document_id', existing.id,
      'old_document_type', existing.document_type,
      'new_document_type', final_type,
      'old_status', existing.verification_status,
      'new_status', verification_status,
      'note', note
    )
  );
end;
$$;

revoke all on function public.classify_property(uuid, text, text) from public, anon;
revoke all on function public.review_document(uuid, text, text, text) from public, anon;
grant execute on function public.classify_property(uuid, text, text) to authenticated;
grant execute on function public.review_document(uuid, text, text, text) to authenticated;
