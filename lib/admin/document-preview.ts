// Opens a property document for an admin (docs/admin.md, section 7). The first open checks the file's first bytes
// and, for Word and TIFF files, converts it to PDF; what happened is recorded with record_document_preview, so later
// opens go straight to the stored outcome. The admin sees only a PDF or an image, through a short-lived signed URL.
//
// The order matters. The document's row is read with the admin's session, so row level security decides whether
// this admin may see it at all, and only then is that one file downloaded with the service role. The service role
// does nothing else here: the PDF is stored, the outcome recorded and the URL signed as the admin.

import { convertToPdf } from "@/lib/admin/converter"
import { matchesDeclaredType } from "@/lib/admin/document-type"
import type { requireAdmin } from "@/lib/auth/staff"
import { createClient as createServiceRoleClient } from "@/lib/supabase/service-role"
import { PROPERTY_DOCUMENTS_BUCKET } from "@/lib/storage/property-documents"

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"]

export const PREVIEWS_BUCKET = "property-document-previews"

// Long enough to load the viewer, short enough that a copied link soon stops working
const SIGNED_URL_SECONDS = 5 * 60

// The same lists as document_is_viewable and document_needs_conversion in the database
const VIEWABLE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])
const CONVERTED = new Set([
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.oasis.opendocument.text",
    "image/tiff",
])

export type DocumentView = { kind: "pdf" | "image"; url: string } | { error: string }

export const DOCUMENT_ERRORS = {
    notFound: "Document not found.",
    missingFile: "The owner's upload didn't finish, so there is no file to open. Ask for the document again.",
    mismatch: "This file isn't what it claims to be, so it won't be opened. Reject it and ask for the document again.",
    unsupported: "This type of file can't be shown. Ask for the document again as a PDF or a photo.",
    conversionFailed: "The document couldn't be converted. Try again in a minute.",
    generic: "The document couldn't be opened. Try again.",
} as const

type DocumentRow = {
    id: string
    property_id: string
    file_path: string
    mime_type: string
    preview_status: "ready" | "failed" | "type_mismatch" | null
    preview_path: string | null
}

const COLUMNS = "id, property_id, file_path, mime_type, preview_status, preview_path"

export async function openDocument(supabase: Supabase, documentId: string): Promise<DocumentView> {
    // As the admin: a document they may not see, or one on a draft, comes back as nothing
    const { data: document, error } = await supabase
        .from("property_documents")
        .select(COLUMNS)
        .eq("id", documentId)
        .maybeSingle<DocumentRow>()
    if (error) {
        console.error("Reading a document to open failed", error)
        return { error: DOCUMENT_ERRORS.generic }
    }
    if (!document) {
        return { error: DOCUMENT_ERRORS.notFound }
    }

    if (document.preview_status === "ready") return signedView(supabase, document)
    if (document.preview_status === "type_mismatch") return { error: DOCUMENT_ERRORS.mismatch }
    if (!VIEWABLE.has(document.mime_type) && !CONVERTED.has(document.mime_type)) {
        return { error: DOCUMENT_ERRORS.unsupported }
    }

    // As the service role, only now, and only this file
    const { data: original, error: downloadError } = await createServiceRoleClient()
        .storage.from(PROPERTY_DOCUMENTS_BUCKET)
        .download(document.file_path)
    if (downloadError || !original) {
        console.error("Downloading a document to check failed", downloadError)
        return { error: DOCUMENT_ERRORS.missingFile }
    }

    // The stored type is checked too, as it is what the browser would be given
    const bytes = new Uint8Array(await original.arrayBuffer())
    if (original.type !== document.mime_type || !matchesDeclaredType(bytes, document.mime_type)) {
        console.warn("A document's contents don't match its type", { documentId, declared: document.mime_type, stored: original.type })
        const recorded = await record(supabase, document.id, "type_mismatch")
        return recorded ? { error: DOCUMENT_ERRORS.mismatch } : { error: DOCUMENT_ERRORS.generic }
    }

    if (VIEWABLE.has(document.mime_type)) {
        return (await record(supabase, document.id, "ready")) ? reopen(supabase, document.id) : { error: DOCUMENT_ERRORS.generic }
    }

    let pdf: Uint8Array
    try {
        pdf = await convertToPdf(bytes, document.mime_type)
    } catch (conversionError) {
        console.error("Converting a document failed", conversionError)
        await record(supabase, document.id, "failed")
        return { error: DOCUMENT_ERRORS.conversionFailed }
    }

    const previewPath = `${document.property_id}/${document.id}.pdf`
    const { error: uploadError } = await supabase.storage
        .from(PREVIEWS_BUCKET)
        .upload(previewPath, new Blob([pdf as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf", upsert: false })
    // Already there: an earlier open stored it but didn't get to record it, or another admin is opening it now.
    // The original can't change, so that PDF is the same document.
    if (uploadError && (uploadError as { code?: string }).code !== "ResourceAlreadyExists") {
        console.error("Storing a converted document failed", uploadError)
        await record(supabase, document.id, "failed")
        return { error: DOCUMENT_ERRORS.conversionFailed }
    }

    return (await record(supabase, document.id, "ready")) ? reopen(supabase, document.id) : { error: DOCUMENT_ERRORS.generic }
}

// Records the outcome. Another admin recording first isn't a failure: whatever they recorded is read back.
async function record(supabase: Supabase, documentId: string, previewStatus: "ready" | "failed" | "type_mismatch") {
    const { error } = await supabase.rpc("record_document_preview", { document_id: documentId, preview_status: previewStatus })
    if (error && error.message !== "This document has already been checked.") {
        console.error("record_document_preview failed", error)
        return false
    }
    return true
}

// Reads the row again after recording, so the view follows what the database holds
async function reopen(supabase: Supabase, documentId: string): Promise<DocumentView> {
    const { data: document } = await supabase.from("property_documents").select(COLUMNS).eq("id", documentId).maybeSingle<DocumentRow>()
    if (document?.preview_status === "ready") return signedView(supabase, document)
    if (document?.preview_status === "type_mismatch") return { error: DOCUMENT_ERRORS.mismatch }
    return { error: DOCUMENT_ERRORS.generic }
}

async function signedView(supabase: Supabase, document: DocumentRow): Promise<DocumentView> {
    const [bucket, path, kind] = document.preview_path
        ? [PREVIEWS_BUCKET, document.preview_path, "pdf" as const]
        : [PROPERTY_DOCUMENTS_BUCKET, document.file_path, document.mime_type === "application/pdf" ? ("pdf" as const) : ("image" as const)]

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS)
    if (error || !data) {
        console.error("Signing a document URL failed", error)
        return { error: DOCUMENT_ERRORS.generic }
    }
    return { kind, url: data.signedUrl }
}
