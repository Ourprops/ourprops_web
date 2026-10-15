-- the documents screen asks for three things: an ownership document, a site or survey plan, and anything else that
-- supports the claim. users upload as many files as they like to each slot and may say what each file is, if they know.
-- the slot and the user's answer are hints: a reviewer sets each document's final type, whatever slot it was put in.

alter table public.property_documents
    add column if not exists slot text,
    add column if not exists declared_type text;

-- documents uploaded before now came from the acquisition question, which only asks for ownership documents
update public.property_documents set slot = 'ownership' where slot is null;

alter table public.property_documents
    alter column slot set not null;

alter table public.property_documents
    drop constraint if exists property_documents_slot_check;

alter table public.property_documents
    add constraint property_documents_slot_check
    check (slot in ('ownership', 'site_plan', 'supporting'));

-- what the user says the document is, or null when they don't know. it takes the reviewer's types except 'other',
-- as not knowing is left as null. keep in step with propertyDocumentTypeSchema in lib/validators/property.ts.
alter table public.property_documents
    drop constraint if exists property_documents_declared_type_check;

alter table public.property_documents
    add constraint property_documents_declared_type_check
    check (declared_type in (
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
        'grantor_authority_documents'
    ));

-- document_type is now the reviewer's classification alone, and null until a reviewer sets it.
-- registration used to save every document as 'other' to mean "not classified yet", so those become null.
alter table public.property_documents
    alter column document_type drop not null;

update public.property_documents
    set document_type = null
    where document_type = 'other' and verification_status = 'unreviewed';

-- users record a document's slot and their answer, but not its type, which only reviewers set through the service role.
-- revoking the table privilege also revokes the column privileges granted before, so the columns are granted again.
revoke insert on table public.property_documents from authenticated;
grant insert (id, property_id, uploaded_by, slot, declared_type, file_path, file_name, file_size_bytes, mime_type)
  on table public.property_documents to authenticated;

-- the user can change their answer, but nothing else about a document
grant update (declared_type) on table public.property_documents to authenticated;

-- an answer can be changed while the property is a draft, until a reviewer has looked at the document
drop policy if exists "property_documents_update_own_draft" on public.property_documents;
create policy "property_documents_update_own_draft"
  on public.property_documents
  for update
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
  )
  with check (
    verification_status = 'unreviewed'
    and exists (
      select 1
      from public.properties
      where properties.id = property_documents.property_id
        and properties.submitted_by = (select auth.uid())
        and properties.status = 'draft'
    )
  );
