-- the first schema gave anon and authenticated every privilege on every table. row level security blocks them
-- today, but each grant is one mistaken policy away from letting users write tables they never should.
-- truncate ignores row level security altogether, so it goes too.

-- tables with no policies that the app doesn't read or write as a user.
-- the database writes them through security definer functions (audit_logs from submit_property, overlap flags
-- from the boundary trigger under save_draft_boundary), so they keep working.
-- the admin console grants the reads it needs, table by table, alongside its policies.
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.data_room_access_requests from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.property_checkpoints from anon, authenticated;
revoke all on table public.property_co_owners from anon, authenticated;
revoke all on table public.property_images from anon, authenticated;
revoke all on table public.property_overlap_flags from anon, authenticated;

-- profiles: signed-out users get nothing. signed-in users keep only what the app uses:
-- reading their own row and updating the columns granted in 20261007120000_profiles_self_service_policies.sql.
-- sign-up creates profiles with the service role, so users never need insert. without it, an insert policy
-- added by mistake can't become a way to create a profile with role 'admin'.
revoke all on table public.profiles from anon;
revoke insert, delete, truncate, references, trigger, maintain on table public.profiles from authenticated;
