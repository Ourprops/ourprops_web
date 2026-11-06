// Where owners' identity document photos are kept. The bucket is private: the storage policies let a user add files to,
// and read, their own folder only, and remove a file once no saved document points to it.
// Set up in supabase/migrations/20261017130000_identity_documents.sql and narrowed in
// 20261106130000_identity_documents_no_heic.sql; keep the limits below in step with the bucket.

export const IDENTITY_DOCUMENTS_BUCKET = "identity-documents"

/** The largest file the bucket accepts */
export const MAX_IDENTITY_FILE_BYTES = 10 * 1024 * 1024

/** A photo of the card or the passport's photo page, usually from a phone camera, or a scan */
export const IDENTITY_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const

const MIME_TYPES_BY_EXTENSION: Record<string, (typeof IDENTITY_MIME_TYPES)[number]> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
}

/** For the file input's `accept`. HEIC isn't in it, so iPhones send a JPEG. */
export const IDENTITY_FILE_ACCEPT = [
    ...Object.keys(MIME_TYPES_BY_EXTENSION).map((extension) => `.${extension}`),
    ...IDENTITY_MIME_TYPES,
].join(",")

/** The file's type as the bucket expects it, or what the browser reported when it isn't one the bucket takes */
export function identityMimeType(file: { name: string; type: string }): string {
    if ((IDENTITY_MIME_TYPES as readonly string[]).includes(file.type)) return file.type
    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    return MIME_TYPES_BY_EXTENSION[extension] ?? file.type
}

/**
 * Where a new photo goes: {profile_id}/{random}.{extension}. The owner's file name isn't kept, as a photo's name can
 * say something about them, and a random name means a replacement never collides with the file it replaces.
 */
export function identityFilePath(profileId: string, mimeType: string) {
    const extension = Object.entries(MIME_TYPES_BY_EXTENSION).find(([, type]) => type === mimeType)?.[0] ?? "bin"
    return `${profileId.toLowerCase()}/${crypto.randomUUID()}.${extension}`
}
