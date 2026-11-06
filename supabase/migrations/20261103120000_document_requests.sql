-- requesting changes (docs/admin.md, section 5, build order step 5), the first part: an admin asks the owner for
-- documents, and for their identity document if it's missing; the owner uploads only what was asked for and sends
-- the property back. owners editing their answers comes later, so nothing here resets checkpoints.

-- what the admin asked for. the owner reads their own property's requests; nobody writes them directly.
-- a request is fulfilled by resubmit_property, once a file answering it is in storage, not when the owner
-- records the upload: the app records a document before sending its file, and the upload can still fail.
create table public.property_document_requests (
  id                       uuid        primary key default gen_random_uuid(),
  property_id              uuid        not null references public.properties(id) on delete cascade,
  -- the checklist item the owner uploads into (property_documents_slot_check)
  slot                     text        not null,
  -- what to send, and why; the owner sees it
  note                     text        not null,
  requested_by             uuid        not null references public.profiles(id),
  created_at               timestamptz not null default now(),
  fulfilled_by_document_id uuid        references public.property_documents(id),
  fulfilled_at             timestamptz,
  constraint property_document_requests_slot_check check (slot in ('ownership', 'site_plan', 'supporting')),
  constraint property_document_requests_note_check check (length(trim(note)) between 1 and 2000),
  constraint property_document_requests_fulfilled_check check ((fulfilled_at is null) = (fulfilled_by_document_id is null))
);

alter table public.property_document_requests enable row level security;

create index idx_property_document_requests_property_id on public.property_document_requests (property_id);
create index idx_property_document_requests_requested_by on public.property_document_requests (requested_by);
create index idx_property_document_requests_fulfilled_by on public.property_document_requests (fulfilled_by_document_id);

revoke all on table public.property_document_requests from anon, authenticated;
grant select on table public.property_document_requests to authenticated;

create policy "property_document_requests_select_admin"
  on public.property_document_requests
  for select
  to authenticated
  using ((select public.staff_role()) = 'admin');

create policy "property_document_requests_select_own"
  on public.property_document_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.properties
      where properties.id = property_document_requests.property_id
        and properties.submitted_by = (select auth.uid())
    )
  );

-- the admin's message, and whether they asked for the owner's identity document. the owner reads both on
-- their own property; users hold no update grant on either, so only the functions below write them.
alter table public.properties add column changes_requested_message text;
alter table public.properties add column identity_requested boolean not null default false;

-- both are set only while changes are requested. not valid, so a row changed by hand before this migration
-- isn't refused; it has to satisfy them the next time it changes.
alter table public.properties add constraint properties_changes_requested_message_check
  check ((status = 'action_required') = (changes_requested_message is not null)) not valid;
alter table public.properties add constraint properties_identity_requested_check
  check (not identity_requested or status = 'action_required') not valid;

-- whether the caller may add (or take back) a document in this slot: their own property, waiting on them,
-- with a request for the slot still open that was made before the document. so an owner can replace a wrong
-- upload before sending the property back, but never touch a document from before the request.
-- security definer, so the policies below can read requests without a policy of their own being involved.
create or replace function public.answers_open_request(property_id uuid, slot text, uploaded_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties
    join public.property_document_requests on property_document_requests.property_id = properties.id
    where properties.id = answers_open_request.property_id
      and properties.submitted_by = (select auth.uid())
      and properties.status = 'action_required'
      and property_document_requests.slot = answers_open_request.slot
      and property_document_requests.fulfilled_at is null
      and property_document_requests.created_at <= answers_open_request.uploaded_at
  )
$$;

revoke all on function public.answers_open_request(uuid, text, timestamptz) from public, anon;
grant execute on function public.answers_open_request(uuid, text, timestamptz) to authenticated;

-- the same shape checks as property_documents_insert_own_draft; created_at isn't in the insert grant, so it
-- is always now() and an owner can't backdate a document to before a request
create policy "property_documents_insert_own_requested"
  on public.property_documents
  for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.property_document_property_id(file_path) = property_id
    and split_part(file_path, '/', 2) = id::text
    and public.answers_open_request(property_id, slot, created_at)
  );

-- so a failed upload doesn't leave a record behind, and a wrong file can be taken back before resubmitting
create policy "property_documents_delete_own_requested"
  on public.property_documents
  for delete
  to authenticated
  using (
    verification_status = 'unreviewed'
    and public.answers_open_request(property_id, slot, created_at)
  );

-- the file goes only where a document answering an open request was recorded
drop policy if exists "property_documents_insert_own_requested" on storage.objects;
create policy "property_documents_insert_own_requested"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-documents'
    and exists (
      select 1 from public.property_documents
      where property_documents.file_path = objects.name
        and public.answers_open_request(property_documents.property_id, property_documents.slot, property_documents.created_at)
    )
  );

drop policy if exists "property_documents_delete_own_requested" on storage.objects;
create policy "property_documents_delete_own_requested"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'property-documents'
    and exists (
      select 1 from public.property_documents
      where property_documents.file_path = objects.name
        and property_documents.verification_status = 'unreviewed'
        and public.answers_open_request(property_documents.property_id, property_documents.slot, property_documents.created_at)
    )
  );

-- an admin asks the owner of a property in review for documents, each a checklist item and a note, and for
-- their identity document if needed. the message and notes are shown to the owner, who is notified.
-- documents is a JSON array of {"slot": ..., "note": ...}; it may be empty if only identity is asked for.
create or replace function public.request_changes(property_id uuid, message text, documents jsonb, identity boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
  slots jsonb;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can request changes.' using errcode = '42501';
  end if;

  message := nullif(trim(message), '');
  documents := coalesce(documents, '[]'::jsonb);
  identity := coalesce(identity, false);

  if message is null then
    raise exception 'Write the message the owner will see.' using errcode = '23514';
  end if;

  if jsonb_typeof(documents) is distinct from 'array' then
    raise exception 'Documents must be a list.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(documents) as requested
    where jsonb_typeof(requested) is distinct from 'object'
       or coalesce(requested ->> 'slot', '') not in ('ownership', 'site_plan', 'supporting')
       or coalesce(trim(requested ->> 'note'), '') = ''
  ) then
    raise exception 'Each document asked for needs a checklist item and a note.' using errcode = '23514';
  end if;

  if exists (
    select 1 from jsonb_array_elements(documents) as requested
    where length(trim(requested ->> 'note')) > 2000
  ) then
    raise exception 'Keep each note to 2,000 characters or fewer.' using errcode = '23514';
  end if;

  -- with no answers to edit yet, there is nothing else the owner could do
  if jsonb_array_length(documents) = 0 and not identity then
    raise exception 'Ask for at least one document, or for the owner''s identity document.' using errcode = '23514';
  end if;

  select * into property
  from public.properties
  where id = request_changes.property_id
  for update;

  if not found or property.status = 'draft' then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'under_review' then
    raise exception 'Changes can be requested only while the property is in review.' using errcode = '23514';
  end if;

  update public.properties
  set status = 'action_required',
      changes_requested_message = message,
      identity_requested = identity
  where id = request_changes.property_id;

  insert into public.property_document_requests (property_id, slot, note, requested_by)
  select request_changes.property_id, requested ->> 'slot', trim(requested ->> 'note'), caller
  from jsonb_array_elements(documents) as requested;

  select coalesce(jsonb_agg(requested ->> 'slot'), '[]'::jsonb) into slots
  from jsonb_array_elements(documents) as requested;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    request_changes.property_id,
    'changes_requested',
    jsonb_build_object('message', message, 'slots', slots, 'identity', identity)
  );

  -- the owner's message never names the admin (section 5, "What owners see")
  insert into public.notifications (recipient_id, type, entity_type, entity_id, title, body, action_url)
  values (
    property.submitted_by,
    'property.changes_requested',
    'property',
    request_changes.property_id,
    'We need something from you',
    message,
    '/account/dashboard/properties/' || request_changes.property_id
  );
end;
$$;

-- the owner sends a property back for review once every request has a file in storage, and, if their identity
-- document was asked for, once they have saved one that isn't rejected. each request is fulfilled by the latest
-- document in its slot uploaded since the request; two requests for one slot need two documents.
create or replace function public.resubmit_property(property_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property public.properties;
  request record;
  answer uuid;
  used uuid[] := '{}';
  missing int := 0;
begin
  if caller is null then
    raise exception 'Sign in to send your property back.' using errcode = '42501';
  end if;

  -- another user's property looks as if it doesn't exist
  select * into property
  from public.properties
  where id = resubmit_property.property_id
    and submitted_by = caller
  for update;

  if not found then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property.status <> 'action_required' then
    raise exception 'This property isn''t waiting on anything from you.' using errcode = '23514';
  end if;

  if property.identity_requested and not exists (
    select 1 from public.identity_documents
    where identity_documents.profile_id = caller
      and identity_documents.verification_status in ('unreviewed', 'verified')
  ) then
    raise exception 'Add your identity document first.' using errcode = '23514';
  end if;

  for request in
    select property_document_requests.id, property_document_requests.slot, property_document_requests.created_at
    from public.property_document_requests
    where property_document_requests.property_id = resubmit_property.property_id
      and property_document_requests.fulfilled_at is null
    order by property_document_requests.created_at, property_document_requests.id
    for update
  loop
    select property_documents.id into answer
    from public.property_documents
    where property_documents.property_id = resubmit_property.property_id
      and property_documents.slot = request.slot
      and property_documents.created_at >= request.created_at
      and property_documents.id <> all (used)
      and exists (
        select 1 from storage.objects
        where objects.bucket_id = 'property-documents'
          and objects.name = property_documents.file_path
      )
    order by property_documents.created_at desc, property_documents.id
    limit 1;

    if answer is null then
      missing := missing + 1;
    else
      used := used || answer;
      update public.property_document_requests
      set fulfilled_by_document_id = answer,
          fulfilled_at = now()
      where id = request.id;
    end if;
  end loop;

  -- raising undoes the requests fulfilled above, so nothing is half done
  if missing = 1 then
    raise exception 'Upload the document we asked for first.' using errcode = '23514';
  elsif missing > 1 then
    raise exception 'Upload the % documents we asked for first.', missing using errcode = '23514';
  end if;

  update public.properties
  set status = 'under_review',
      changes_requested_message = null,
      identity_requested = false
  where id = resubmit_property.property_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    resubmit_property.property_id,
    'property_resubmitted',
    jsonb_build_object('document_ids', to_jsonb(used))
  );
end;
$$;

revoke all on function public.request_changes(uuid, text, jsonb, boolean) from public, anon;
revoke all on function public.resubmit_property(uuid) from public, anon;
grant execute on function public.request_changes(uuid, text, jsonb, boolean) to authenticated;
grant execute on function public.resubmit_property(uuid) to authenticated;

-- approval also needs every request fulfilled (section 5, "When a property can become active")
create or replace function public.approval_blockers(property_id uuid)
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  checkpoint record;
  unreviewed int;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can approve properties.' using errcode = '42501';
  end if;

  -- each of the seven in console order, including any that is missing. the names match CHECKPOINT_LABELS
  -- in lib/admin/labels.ts. ownership and identity can't be waived, so only verified counts for them.
  for checkpoint in
    select
      keys.label,
      keys.key in ('ownership_claim_verified', 'identity_verified') as must_verify,
      property_checkpoints.status
    from (
      values
        (1, 'identity_verified', 'Owner''s identity'),
        (2, 'ownership_claim_verified', 'Ownership claim'),
        (3, 'boundary_mapped', 'Boundary mapped'),
        (4, 'cadastral_cross_check', 'Cadastral cross-check'),
        (5, 'overlap_clearance', 'No overlaps'),
        (6, 'official_search_status', 'Lands Commission search'),
        (7, 'encumbrance_clearance', 'Court cases and encumbrances')
    ) as keys (position, key, label)
    left join public.property_checkpoints
      on property_checkpoints.property_id = approval_blockers.property_id
     and property_checkpoints.checkpoint_key = keys.key
    order by keys.position
  loop
    if checkpoint.must_verify and checkpoint.status is distinct from 'verified' then
      return next checkpoint.label || ' isn''t verified.';
    elsif not checkpoint.must_verify and checkpoint.status is distinct from 'verified'
          and checkpoint.status is distinct from 'waived' then
      return next checkpoint.label || ' isn''t verified or waived.';
    end if;
  end loop;

  if exists (
    select 1 from public.properties
    where properties.id = approval_blockers.property_id
      and (properties.ownership_type is null or properties.ownership_structure is null)
  ) then
    return next 'The ownership type and structure aren''t classified.';
  end if;

  select count(*) into unreviewed
  from public.property_documents
  where property_documents.property_id = approval_blockers.property_id
    and property_documents.verification_status = 'unreviewed';

  if unreviewed = 1 then
    return next '1 document still needs reviewing.';
  elsif unreviewed > 1 then
    return next unreviewed || ' documents still need reviewing.';
  end if;

  -- only flags the admin can see and resolve: an overlap with someone's draft is hidden from admins
  -- (property_overlap_flags_select_admin), and would otherwise block approval with no way to clear it
  if exists (
    select 1 from public.property_overlap_flags
    join public.properties as subject on subject.id = property_overlap_flags.property_id
    join public.properties as other on other.id = property_overlap_flags.conflicting_property_id
    where approval_blockers.property_id in (property_overlap_flags.property_id, property_overlap_flags.conflicting_property_id)
      and property_overlap_flags.status in ('detected', 'investigating')
      and subject.status <> 'draft'
      and other.status <> 'draft'
  ) then
    return next 'An overlap with another property is still open.';
  end if;

  -- resubmit_property fulfils every request before the property is back in review, so this only shows
  -- if a request is left open some other way
  if exists (
    select 1 from public.property_document_requests
    where property_document_requests.property_id = approval_blockers.property_id
      and property_document_requests.fulfilled_at is null
  ) then
    return next 'A document asked for from the owner hasn''t arrived.';
  end if;
end;
$$;
