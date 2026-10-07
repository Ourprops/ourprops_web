-- Signup only knows the user's name; phone number is collected during onboarding.
alter table public.profiles
  alter column phone_number drop not null;

-- New profiles start as 'owner'; users can switch to 'developer' during onboarding.
alter table public.profiles
  alter column role set default 'owner';

-- Every profile now starts with a role, so "role can be set once while null" no longer works.
-- Instead: users may change their role (to 'owner' or 'developer' only) until onboarding is complete.
-- After that, and for any 'partner_verifier' / 'admin' assignment, the service role is required.
create or replace function public.profiles_guard_self_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and new.role is distinct from old.role then
    if old.onboarding_complete then
      raise exception 'Role cannot be changed after onboarding.' using errcode = '42501';
    end if;
    if new.role not in ('owner', 'developer') then
      raise exception 'Role % cannot be self-assigned.', new.role using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
