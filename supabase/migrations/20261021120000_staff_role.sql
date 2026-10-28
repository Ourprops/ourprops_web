-- the signed-in user's staff role, if they signed in with a second factor. null for everyone else.
-- the admin console's policies and functions all check this, so a stolen password alone reaches nothing:
-- a session is aal2 only after the TOTP step (docs/admin.md, section 4).
-- the token says aal2 until it expires, even after its factor is removed, so a verified factor must
-- also still exist: removing an admin's factors ends their access at once, not when the token expires.
-- V1 recognises admins only; partner_verifier is added here when assignments exist.
-- security definer so a policy on another table can call it without the caller needing to read profiles
-- or auth.mfa_factors.
-- call it as (select public.staff_role()) in policies, so it runs once per query rather than once per row.
create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid())
    and role = 'admin'
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1 from auth.mfa_factors
      where mfa_factors.user_id = profiles.id
        and mfa_factors.status = 'verified'
    )
$$;

-- signed-out users have no staff role to look up. signed-in users need execute because the policies
-- that call it run as them.
revoke all on function public.staff_role() from public, anon;
grant execute on function public.staff_role() to authenticated;
