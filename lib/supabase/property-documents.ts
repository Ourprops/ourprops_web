import type { SupabaseClient } from "@supabase/supabase-js"

import { PROPERTY_DOCUMENTS_BUCKET, propertyDocumentPath } from "@/lib/storage/property-documents"
import { propertyIdSchema, type DocumentReference, type DocumentUpload } from "@/lib/validators/property"

// Records and removes the documents users upload to their drafts, as the signed-in user.
// Row level security and the storage policies limit each user to their own drafts.

// Raised by Postgres when row level security refuses a write, here because the draft isn't the user's
const ROW_SECURITY_REFUSED = "42501"

// Documents are classified by a reviewer, so registration saves them all as 'other'
const UNCLASSIFIED = "other"

/**
 * Records a document before its file is uploaded, and returns where to upload it.
 * The storage policies only take a file at a path recorded here. Returns null when the draft isn't the user's.
 */
export async function createDocument(
    supabase: SupabaseClient,
    userId: string,
    propertyId: string,
    upload: DocumentUpload,
): Promise<DocumentReference | null> {
    if (!propertyIdSchema.safeParse(propertyId).success) return null

    // The id is part of the path, so it is chosen here rather than by the database
    const id = crypto.randomUUID()
    const path = propertyDocumentPath(propertyId, id, upload.file_name)

    const { error } = await supabase.from("property_documents").insert({
        id,
        property_id: propertyId,
        uploaded_by: userId,
        document_type: UNCLASSIFIED,
        file_path: path,
        file_name: upload.file_name,
        file_size_bytes: upload.file_size_bytes,
        mime_type: upload.mime_type,
    })

    if (error?.code === ROW_SECURITY_REFUSED) return null
    if (error) throw error
    return { id, path, file_name: upload.file_name }
}

/** Removes a document and its file. Returns false when there is no such document the user can remove. */
export async function deleteDocument(supabase: SupabaseClient, propertyId: string, documentId: string) {
    if (!propertyIdSchema.safeParse(propertyId).success || !propertyIdSchema.safeParse(documentId).success) return false

    // The record goes first, so it never points to a file that has gone; a file left behind is private and unused
    const { data, error } = await supabase
        .from("property_documents")
        .delete()
        .eq("id", documentId)
        .eq("property_id", propertyId)
        .select("file_path")
        .maybeSingle<{ file_path: string }>()

    if (error) throw error
    if (!data) return false

    const { error: storageError } = await supabase.storage.from(PROPERTY_DOCUMENTS_BUCKET).remove([data.file_path])
    if (storageError) console.error("Error removing a property document's file:", storageError)
    return true
}
