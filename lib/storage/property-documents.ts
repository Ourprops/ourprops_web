// Where uploaded property documents are kept. The bucket is private: the storage policies let a user read the files of
// their own properties, and add or remove files only while the property is a draft.
// Set up in supabase/migrations/20261014140000_property_documents_bucket.sql and widened in
// 20261014160000_property_documents_word_files.sql; keep the limits below in step with the bucket.

export const PROPERTY_DOCUMENTS_BUCKET = "property-documents"

/** The largest file the bucket accepts */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

/**
 * The kinds of file the bucket takes. Ownership documents in Ghana usually arrive as PDFs, photos taken on a phone
 * (including iPhone HEIC photos and pictures saved from WhatsApp), scans from an office scanner (often TIFF), or Word
 * files typed up by a lawyer or typist, including ones made in WPS Office or LibreOffice.
 * Macro-enabled Word files (.docm) are left out, as macros can run code when a reviewer opens the file.
 * The bucket trusts the declared type and doesn't look inside files: see "Known risks" in docs/architecture.md.
 */
export const DOCUMENT_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.oasis.opendocument.text",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/tiff",
] as const

export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number]

// Browsers often report no type, or a generic one, for HEIC photos and for Word files on Android,
// so the extension is used when the reported type isn't one the bucket takes
const MIME_TYPES_BY_EXTENSION: Record<string, DocumentMimeType> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    odt: "application/vnd.oasis.opendocument.text",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    tif: "image/tiff",
    tiff: "image/tiff",
}

/** For a file input's `accept`: extensions as well as types, as some phones only match on the extension */
export const DOCUMENT_FILE_ACCEPT = [
    ...Object.keys(MIME_TYPES_BY_EXTENSION).map((extension) => `.${extension}`),
    ...DOCUMENT_MIME_TYPES,
].join(",")

/** What the user may upload, in words */
export const ACCEPTED_DOCUMENTS =
    "a PDF, a Word document (DOC, DOCX or ODT), or a photo or scan (JPEG, PNG, HEIC, WebP or TIFF)"

/** The file's type as the bucket expects it, or what the browser reported when it isn't one the bucket takes */
export function documentMimeType(file: { name: string; type: string }): string {
    if ((DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) return file.type
    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    return MIME_TYPES_BY_EXTENSION[extension] ?? file.type
}

/**
 * The path a document is stored at: {property_id}/{property_document_id}/{file name}.
 * The file name is made safe for a storage key; keep the original in property_documents.file_name.
 */
export function propertyDocumentPath(propertyId: string, documentId: string, fileName: string) {
    return `${propertyId.toLowerCase()}/${documentId.toLowerCase()}/${storageFileName(fileName)}`
}

// Storage keys only allow some characters, so anything else (including slashes, which would add a folder) becomes a dash
function storageFileName(fileName: string) {
    const dot = fileName.lastIndexOf(".")
    const [base, extension] = dot > 0 ? [fileName.slice(0, dot), fileName.slice(dot + 1)] : [fileName, ""]
    const clean = (part: string) =>
        part
            .normalize("NFKD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^A-Za-z0-9_-]+/g, "-")
            .replace(/^-+|-+$/g, "")
    const safeBase = clean(base).slice(0, 100) || "document"
    const safeExtension = clean(extension).toLowerCase().slice(0, 10)
    return safeExtension ? `${safeBase}.${safeExtension}` : safeBase
}
