-- record when a property's boundary or pin last changed

alter table public.property_boundaries
    add column if not exists updated_at timestamp with time zone not null default now();

-- rows saved before this column existed were last changed when they were created
update public.property_boundaries
    set updated_at = created_at;

-- keep updated_at current; properties_set_updated_at only sets new.updated_at, so it works for this table too.
-- save_draft_boundary skips the update when the boundary hasn't changed, so saving the same boundary keeps its time.
drop trigger if exists property_boundaries_set_updated_at on public.property_boundaries;
create trigger property_boundaries_set_updated_at
  before update on public.property_boundaries
  for each row
  execute function public.properties_set_updated_at();
