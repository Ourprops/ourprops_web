-- identity documents, the first part (docs/admin.md, section 5, "Identity documents"; build order step 6): a keyed
-- fingerprint of each document number, so the number itself can be deleted once the document is verified while the
-- unique check still stops one card verifying two accounts. this migration only makes the deletion possible;
-- review_identity_document, which does it, comes next.
--
-- the fingerprint is an HMAC-SHA256 with a secret key in Supabase Vault. a plain hash wouldn't do: a Ghana Card number
-- has few enough possible values that anyone holding the hashes could try them all. the key is made here, in each
-- database, and never appears in git or the app.
--
-- THE KEY IS PERMANENT. once numbers are deleted, their fingerprints can't be recomputed under a new key, so a new or
-- lost key means every verified document stops blocking duplicates. back it up after this runs: in Studio, run
-- `select decrypted_secret from vault.decrypted_secrets where name = 'identity_number_hmac_key'` and keep the value
-- in the password manager. never rotate it.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'identity_number_hmac_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'identity_number_hmac_key',
      'Keys the fingerprints of identity document numbers (identity_documents.document_number_hmac). Permanent: never rotate, back it up.'
    );
  end if;
end;
$$;

-- the fingerprint of a number, as save_identity_document normalises it. the type and country are part of it, as
-- they were part of the unique check it replaces: the same digits on a Ghana Card and a passport are different
-- documents. nobody can call this but the functions and the trigger below: anyone able to call it could fingerprint
-- every possible number and match them against the table, which admins can read.
create or replace function public.identity_number_fingerprint(
  document_type text,
  issuing_country text,
  document_number text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  key text;
begin
  select decrypted_secret into key
  from vault.decrypted_secrets
  where name = 'identity_number_hmac_key';

  -- refuse rather than store a fingerprint nothing can ever match
  if key is null then
    raise exception 'The identity number key is missing from Vault.';
  end if;

  return encode(
    extensions.hmac(document_type || ':' || issuing_country || ':' || document_number, key, 'sha256'),
    'hex'
  );
end;
$$;

-- service_role too: the app's server key has no reason to make fingerprints, and Supabase grants it new functions
revoke all on function public.identity_number_fingerprint(text, text, text) from public, anon, authenticated, service_role;

alter table public.identity_documents add column document_number_hmac text;

-- keeps the fingerprint in step with whatever writes the number. clearing the number keeps the fingerprint, which is
-- the point: it outlives the number it was made from.
create or replace function public.identity_documents_set_fingerprint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.document_number is not null then
    new.document_number_hmac := public.identity_number_fingerprint(new.document_type, new.issuing_country, new.document_number);
  end if;
  return new;
end;
$$;

revoke all on function public.identity_documents_set_fingerprint() from public, anon, authenticated, service_role;

create trigger identity_documents_set_fingerprint
  before insert or update of document_type, issuing_country, document_number on public.identity_documents
  for each row
  execute function public.identity_documents_set_fingerprint();

-- documents saved before this migration; the trigger fills them in
update public.identity_documents set document_number = document_number;

-- the unique check moves from the number to its fingerprint, so it still holds once the number is gone
alter table public.identity_documents
  alter column document_number_hmac set not null,
  drop constraint identity_documents_number_key,
  add constraint identity_documents_number_hmac_key unique (document_number_hmac),
  add constraint identity_documents_number_hmac_check check (document_number_hmac ~ '^[0-9a-f]{64}$');

-- the number and the photo can now be cleared, but only from a verified document: one waiting for review, or
-- rejected, still needs both for the admin to look at
alter table public.identity_documents
  alter column document_number drop not null,
  alter column file_path drop not null,
  add constraint identity_documents_kept_until_verified_check
    check (verification_status = 'verified' or (document_number is not null and file_path is not null));
