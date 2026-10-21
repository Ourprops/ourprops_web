-- "Passport" is not an approved product name, so a reviewed property's status is just 'active'.
-- the constraint is dropped first so existing rows can move to the new value before it is enforced again.
alter table public.properties drop constraint properties_status_check;

update public.properties
  set status = 'active'
  where status = 'active_passport';

alter table public.properties add constraint properties_status_check
  check (status in ('draft', 'submitted', 'under_review', 'action_required', 'active', 'suspended'));
