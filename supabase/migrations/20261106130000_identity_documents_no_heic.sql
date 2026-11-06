-- identity documents no longer take HEIC photos, for the same reason property documents don't
-- (20261104130000_no_heic.sql): browsers can't display them, so an admin could never look at one. the identity page
-- leaves HEIC out of the file input's accept, so iPhones send a JPEG instead.

update storage.buckets
  set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  where id = 'identity-documents';
