-- Give an existing user a staff role, or take it away, and record it in audit_logs.
-- See docs/admin.md, section 4 ("Granting and removing admins").
--
-- How to use:
--   1. The person signs up on the site first. For admin, they also set up an
--      authenticator app at /account/security.
--   2. Open the Supabase dashboard, SQL editor, and paste this whole file.
--   3. Change the three values under "declare", then run it.
--
-- To remove someone's access, run it again with new_role := 'owner'.
--
-- Note: 'partner_verifier' can be set, but it gives no access yet.
-- public.staff_role() only recognises 'admin' in V1.
--
-- This works in the SQL editor because it runs as the postgres user. The
-- profiles_guard_self_update trigger only blocks role changes made by signed-in
-- users, so nobody can run this on themselves from the app.

do $$
declare
  target_email text := 'person@example.com';
  new_role     text := 'admin';            -- 'admin', 'partner_verifier', or 'owner' to remove access
  granted_by   text := 'Your Name';        -- the SQL editor has no signed-in user, so say who ran this
  target_id    uuid;
  old_role     text;
begin
  select u.id, p.role into target_id, old_role
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(target_email);

  if target_id is null then
    raise exception 'No user with a profile for %', target_email;
  end if;

  -- Without a verified authenticator app an admin could never pass the second-factor check
  if new_role = 'admin' and not exists (
    select 1 from auth.mfa_factors
    where user_id = target_id and status = 'verified'
  ) then
    raise exception '% has no verified authenticator app. Ask them to set one up at /account/security first.', target_email;
  end if;

  update public.profiles set role = new_role where id = target_id;

  insert into public.audit_logs (actor_id, property_id, action, metadata)
  values (null, null, 'role_changed', jsonb_build_object(
    'user_id', target_id,
    'old_role', old_role,
    'new_role', new_role,
    'granted_by', granted_by
  ));

  raise notice '% is now % (was %)', target_email, new_role, old_role;
end $$;
