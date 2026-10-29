-- record how the user came to own a property, and let them upload the documents that show it

-- a draft has no answer until the user gives one; 'unsure' is an answer they choose, not a default
alter table public.properties
    alter column acquisition_method drop default,
    alter column acquisition_method drop not null;

-- once a property leaves draft it must say how it was acquired, even if that is 'unsure'
alter table public.properties
    drop constraint if exists properties_complete_unless_draft;

alter table public.properties
    add constraint properties_complete_unless_draft
    check (
        status = 'draft'
        or (
            name is not null and slug is not null and property_type is not null and region is not null
            and city_town is not null and acquisition_method is not null
        )
    );

-- documents uploaded during registration aren't classified yet, so they are saved as 'other' for a reviewer to sort
alter table public.property_documents
    drop constraint if exists property_documents_document_type_check;

alter table public.property_documents
    add constraint property_documents_document_type_check
    check (document_type in (
        'land_title_certificate',
        'indenture',
        'deed_of_conveyance',
        'deed_of_assignment',
        'lease_agreement',
        'sublease_agreement',
        'sale_and_purchase_agreement',
        'allocation_letter',
        'site_plan',
        'cadastral_plan',
        'previous_owner_acquisition_document',
        'consent_to_assign',
        'head_lease',
        'grant_of_probate',
        'letters_of_administration',
        'will',
        'power_of_attorney',
        'official_land_search_report',
        'ground_rent_receipts',
        'property_rate_receipts',
        'utility_bills',
        'subdivision_approval',
        'court_order',
        'grantor_authority_documents',
        'other'
    ));

-- signed-out users have no access; signed-in users record the documents they upload to their own drafts.
-- verification_status and is_confidential keep their defaults and are changed by reviewers through the service role.
revoke all on table public.property_documents from anon;
-- truncate ignores row level security, so it is removed along with the other privileges the app doesn't need
revoke insert, update, delete, truncate, references, trigger, maintain on table public.property_documents from authenticated;
grant insert (id, property_id, uploaded_by, document_type, file_path, file_name, file_size_bytes, mime_type)
  on table public.property_documents to authenticated;
grant delete on table public.property_documents to authenticated;

drop policy if exists "property_documents_select_own" on public.property_documents;
create policy "property_documents_select_own"
  on public.property_documents
  for select
  to authenticated
  using (exists (
    select 1
    from public.properties
    where properties.id = property_documents.property_id
      and properties.submitted_by = (select auth.uid())
  ));

-- the file must be stored at {property_id}/{this document's id}/{file name} in the property-documents bucket
drop policy if exists "property_documents_insert_own_draft" on public.property_documents;
create policy "property_documents_insert_own_draft"
  on public.property_documents
  for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.property_document_property_id(file_path) = property_id
    and split_part(file_path, '/', 2) = id::text
    and exists (
      select 1
      from public.properties
      where properties.id = property_documents.property_id
        and properties.submitted_by = (select auth.uid())
        and properties.status = 'draft'
    )
  );

-- a document can be removed from a draft until a reviewer has looked at it
drop policy if exists "property_documents_delete_own_draft" on public.property_documents;
create policy "property_documents_delete_own_draft"
  on public.property_documents
  for delete
  to authenticated
  using (
    verification_status = 'unreviewed'
    and exists (
      select 1
      from public.properties
      where properties.id = property_documents.property_id
        and properties.submitted_by = (select auth.uid())
        and properties.status = 'draft'
    )
  );

-- a file can only be uploaded for a document the user has recorded, at the path recorded for it
drop policy if exists "property_documents_insert_own_draft" on storage.objects;
create policy "property_documents_insert_own_draft"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-documents'
    and exists (
      select 1
      from public.property_documents
      join public.properties on properties.id = property_documents.property_id
      where property_documents.file_path = objects.name
        and properties.submitted_by = (select auth.uid())
        and properties.status = 'draft'
    )
  );
