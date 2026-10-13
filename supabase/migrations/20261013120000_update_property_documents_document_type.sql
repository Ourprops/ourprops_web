-- replace the allowed document_type values on the property_documents table

alter table public.property_documents
    drop constraint if exists property_documents_document_type_check;

-- enforce valid document types
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
        'grantor_authority_documents'
    ));
