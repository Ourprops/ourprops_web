-- Let signed-in users read and update their own profile (used by /onboarding),
-- without letting them grant themselves privileged roles.

alter table public.profiles enable row level security;

-- Users may only update these columns directly; everything else goes through the service role.
revoke update on table public.profiles from anon, authenticated;
grant update (full_name, phone_number, role, onboarding_complete) on table public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Users can choose their role once, and only as 'owner' or 'developer'.
-- Later role changes (and any 'partner_verifier' / 'admin' assignment) must use the service role.
create or replace function public.profiles_guard_self_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and new.role is distinct from old.role then
    if old.role is not null then
      raise exception 'Role cannot be changed once set.' using errcode = '42501';
    end if;
    if new.role not in ('owner', 'developer') then
      raise exception 'Role % cannot be self-assigned.', new.role using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update
  before update on public.profiles
  for each row
  execute function public.profiles_guard_self_update();
