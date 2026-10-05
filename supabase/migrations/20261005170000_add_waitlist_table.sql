create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  created_at timestamp with time zone not null default now(),
  constraint waitlist_role_check check (
    role = any (
      array[
        'Property Owner'::text,
        'Seeker (Buyer/Family)'::text,
        'Agent / Real Estate Professional'::text,
        'Other'::text
      ]
    )
  )
);

create unique index if not exists waitlist_email_lower_key
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon, authenticated;
grant insert on table public.waitlist to anon, authenticated;

drop policy if exists "waitlist_insert_only" on public.waitlist;

create policy "waitlist_insert_only"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (
    email is not null
    and role is not null
  );
