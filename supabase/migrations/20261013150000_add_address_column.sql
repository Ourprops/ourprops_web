-- add a street address to properties, alongside the GhanaPost GPS digital_address

alter table public.properties
    add column if not exists address text;

-- signed-in users can fill it in on their drafts, like the other location fields
grant insert (address), update (address) on table public.properties to authenticated;
