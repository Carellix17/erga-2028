-- P20-targhetta: align the study-pdfs bucket label with what the code legitimately ships.
-- Since 20260125 the bucket allowed ONLY 'application/pdf', but upload-pdf also sends
-- docx / txt / photos (jpg, png, webp, heic, heif) and web-search stores Wikipedia
-- images in the same bucket. On a fresh environment those uploads would be rejected
-- by storage ("mime type not supported").
-- file_size_limit raised 20MB -> 100MB to match the app-level promise
-- (upload-pdf: "Dimensione massima: 100MB"). Decisione del Capo 2026-08-06.
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ],
  file_size_limit = 104857600
WHERE id = 'study-pdfs';
