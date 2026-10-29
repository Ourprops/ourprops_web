-- court cases and registered encumbrances (a mortgage, a caveat, a lease) on a property's land,
-- and the seventh checkpoint, encumbrance_clearance, that they feed (docs/admin.md, section 5, decision 18).
-- admins record them; the admin decides whether each one blocks activation, with no default by kind.
-- the owner sees their own property's encumbrances without the internal notes or who recorded them.
-- nothing here is shown on the public property page.

-- no checkpoint rows exist yet (start_review will create them), so nothing needs adding to existing properties
alter table public.property_checkpoints drop constraint property_checkpoints_checkpoint_key_check;

alter table public.property_checkpoints add constraint property_checkpoints_checkpoint_key_check
  check (checkpoint_key in (
    'identity_verified',
    'ownership_claim_verified',
    'boundary_mapped',
    'cadastral_cross_check',
    'overlap_clearance',
    'official_search_status',
    'encumbrance_clearance'
  ));

create table public.property_encumbrances (
  id                uuid        primary key default gen_random_uuid(),
  property_id       uuid        not null references public.properties(id) on delete cascade,
  kind              text        not null,
  -- the suit number or the registry reference
  reference         text        not null,
  blocks_activation boolean     not null,
  status            text        not null default 'open',
  -- the admin's reasoning; never shown to the owner
  internal_notes    text,
  recorded_by       uuid        not null references public.profiles(id),
  created_at        timestamptz not null default now(),
  resolved_by       uuid        references public.profiles(id),
  resolved_at       timestamptz,
  constraint property_encumbrances_kind_check check (kind in ('mortgage', 'caveat', 'litigation', 'lease', 'other')),
  constraint property_encumbrances_reference_check check (length(trim(reference)) between 1 and 200),
  constraint property_encumbrances_status_check check (status in ('open', 'resolved')),
  -- resolved_by and resolved_at are set exactly when the record is resolved
  constraint property_encumbrances_resolved_check check (
    (status = 'resolved') = (resolved_by is not null and resolved_at is not null)
  )
);

alter table public.property_encumbrances enable row level security;

create index idx_property_encumbrances_property_id on public.property_encumbrances (property_id);
create index idx_property_encumbrances_recorded_by on public.property_encumbrances (recorded_by);
create index idx_property_encumbrances_resolved_by on public.property_encumbrances (resolved_by);

-- admins read the table directly. nobody writes it directly: record_encumbrance and update_encumbrance do,
-- so every change is audited. owners read through property_encumbrances_for_owner, which leaves out
-- internal_notes and the admins' ids; column grants can't do that here, because admins and owners are
-- both the authenticated role.
revoke all on table public.property_encumbrances from anon, authenticated;
grant select on table public.property_encumbrances to authenticated;

create policy "property_encumbrances_select_admin"
  on public.property_encumbrances
  for select
  to authenticated
  using ((select public.staff_role()) = 'admin');

-- encumbrance_clearance can't be verified or waived while an open encumbrance blocks activation.
-- a trigger rather than a check in update_checkpoint, so no function that writes checkpoints can skip it.
-- approve_property already needs every checkpoint verified or waived, so this is all approval needs.
create or replace function public.property_checkpoints_check_encumbrances()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.checkpoint_key = 'encumbrance_clearance'
     and new.status in ('verified', 'waived')
     and exists (
       select 1 from public.property_encumbrances
       where property_encumbrances.property_id = new.property_id
         and property_encumbrances.status = 'open'
         and property_encumbrances.blocks_activation
     ) then
    raise exception 'An open encumbrance blocks this property. Resolve it, or set it not to block, first.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger property_checkpoints_check_encumbrances
  before insert or update of status on public.property_checkpoints
  for each row
  execute function public.property_checkpoints_check_encumbrances();

-- an open encumbrance that blocks activation flags the checkpoint, so the console shows it needs attention.
-- an active property stays active: the admin decides whether to suspend it.
-- resolving the encumbrance leaves the checkpoint flagged; the admin verifies it again.
create or replace function public.property_encumbrances_flag_checkpoint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'open' and new.blocks_activation then
    update public.property_checkpoints
      set status = 'flagged',
          verified_by = null,
          verified_at = null,
          updated_at = now()
      where property_id = new.property_id
        and checkpoint_key = 'encumbrance_clearance'
        and status <> 'flagged';
  end if;
  return new;
end;
$$;

create trigger property_encumbrances_flag_checkpoint
  after insert or update of status, blocks_activation on public.property_encumbrances
  for each row
  execute function public.property_encumbrances_flag_checkpoint();

-- records an encumbrance found on a submitted property. drafts aren't reviewed, so they can't have one.
create or replace function public.record_encumbrance(
  property_id uuid,
  kind text,
  reference text,
  blocks_activation boolean,
  note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  property_status text;
  saved_id uuid;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can record encumbrances.' using errcode = '42501';
  end if;

  if blocks_activation is null then
    raise exception 'Say whether this encumbrance blocks activation.' using errcode = '23502';
  end if;

  select properties.status into property_status
  from public.properties
  where properties.id = record_encumbrance.property_id;

  if not found then
    raise exception 'Property not found.' using errcode = 'P0002';
  end if;

  if property_status = 'draft' then
    raise exception 'This property is still a draft.' using errcode = '23514';
  end if;

  insert into public.property_encumbrances (property_id, kind, reference, blocks_activation, internal_notes, recorded_by)
  values (record_encumbrance.property_id, kind, trim(reference), blocks_activation, nullif(trim(note), ''), caller)
  returning id into saved_id;

  -- the reference and note stay out of the log; the record holds them
  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    record_encumbrance.property_id,
    'encumbrance_recorded',
    jsonb_build_object('encumbrance_id', saved_id, 'kind', kind, 'blocks_activation', blocks_activation)
  );

  return saved_id;
end;
$$;

-- changes whether an encumbrance blocks activation, or resolves or reopens it. a reason is required,
-- and goes in the audit log, which is the record's history.
create or replace function public.update_encumbrance(
  encumbrance_id uuid,
  blocks_activation boolean,
  status text,
  note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  existing public.property_encumbrances;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can change encumbrances.' using errcode = '42501';
  end if;

  if nullif(trim(note), '') is null then
    raise exception 'Give a reason for the change.' using errcode = '23514';
  end if;

  if blocks_activation is null or status is null then
    raise exception 'Say whether it blocks activation and whether it is open or resolved.' using errcode = '23502';
  end if;

  -- locked so two admins changing it at once can't both go through
  select * into existing
  from public.property_encumbrances
  where id = encumbrance_id
  for update;

  if not found then
    raise exception 'Encumbrance not found.' using errcode = 'P0002';
  end if;

  update public.property_encumbrances
    set blocks_activation = update_encumbrance.blocks_activation,
        status = update_encumbrance.status,
        resolved_by = case when update_encumbrance.status = 'resolved' then coalesce(existing.resolved_by, caller) end,
        resolved_at = case when update_encumbrance.status = 'resolved' then coalesce(existing.resolved_at, now()) end
    where id = encumbrance_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (
    caller,
    existing.property_id,
    'encumbrance_updated',
    jsonb_build_object(
      'encumbrance_id', encumbrance_id,
      'old_status', existing.status,
      'new_status', status,
      'old_blocks_activation', existing.blocks_activation,
      'new_blocks_activation', blocks_activation,
      'reason', trim(note)
    )
  );
end;
$$;

-- the encumbrances on one of the caller's own properties, without internal notes or which admin recorded them.
-- someone else's property returns nothing rather than an error, so it doesn't reveal that the property exists.
create or replace function public.property_encumbrances_for_owner(property_id uuid)
returns table (
  id uuid,
  kind text,
  reference text,
  blocks_activation boolean,
  status text,
  created_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.kind, e.reference, e.blocks_activation, e.status, e.created_at, e.resolved_at
  from public.property_encumbrances e
  join public.properties p on p.id = e.property_id
  where e.property_id = property_encumbrances_for_owner.property_id
    and p.submitted_by = (select auth.uid())
  order by e.created_at
$$;

revoke all on function public.property_checkpoints_check_encumbrances() from public, anon, authenticated;
revoke all on function public.property_encumbrances_flag_checkpoint() from public, anon, authenticated;
revoke all on function public.record_encumbrance(uuid, text, text, boolean, text) from public, anon;
revoke all on function public.update_encumbrance(uuid, boolean, text, text) from public, anon;
revoke all on function public.property_encumbrances_for_owner(uuid) from public, anon;
grant execute on function public.record_encumbrance(uuid, text, text, boolean, text) to authenticated;
grant execute on function public.update_encumbrance(uuid, boolean, text, text) to authenticated;
grant execute on function public.property_encumbrances_for_owner(uuid) to authenticated;
