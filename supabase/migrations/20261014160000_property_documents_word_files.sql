-- let users upload Word documents and scans as well as PDFs and photos.
-- ownership documents in Ghana are often typed up in Word (or WPS Office and LibreOffice) by a lawyer or typist,
-- and office scanners often save site plans as TIFF. macro-enabled Word files (.docm) are still refused.

update storage.buckets
  set allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/tiff'
  ]
  where id = 'property-documents';
