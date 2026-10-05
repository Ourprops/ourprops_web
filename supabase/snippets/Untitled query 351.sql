create policy "waitlist_insert_only"
on public.waitlist
for insert
to anon, authenticated
with check (
  email is not null
  and role is not null
);