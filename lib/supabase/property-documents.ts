import type { SupabaseClient } from "@supabase/supabase-js"

import { PROPERTY_DOCUMENTS_BUCKET, propertyDocumentPath } from "@/lib/storage/property-documents"
import {
    documentSlotSchema,
    propertyDocumentTypeSchema,
    propertyIdSchema,
    type DocumentReference,
    type DocumentUpload,
    type DraftDocument,
    type PropertyDocumentType,
} from "@/lib/validators/property"

// Records, lists and removes the documents users upload to their drafts, as the signed-in user.
// Row level security and the storage policies limit each user to their own drafts.

// Raised by Postgres when row level security refuses a write, here because the draft isn't the user's
const ROW_SECURITY_REFUSED = "42501"

const DOCUMENT_COLUMNS = "id, file_path, file_name, slot, declared_type, file_size_bytes, mime_type, created_at"

type DocumentRow = {
    id: string
    file_path: string
    file_name: string
    slot: string
    declared_type: string | null
    file_size_bytes: number
    mime_type: string
    created_at: string
}

// The database limits both columns to known values; should one ever be unknown, the user sees the document as
// supporting and unclassified rather than losing it
function rowToDocument(row: DocumentRow): DraftDocument {
    return {
        id: row.id,
        path: row.file_path,
        file_name: row.file_name,
        slot: documentSlotSchema.safeParse(row.slot).data ?? "supporting",
        declared_type: propertyDocumentTypeSchema.safeParse(row.declared_type).data ?? null,
        file_size_bytes: row.file_size_bytes,
        mime_type: row.mime_type,
        created_at: row.created_at,
    }
}

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

    // The type is left for a reviewer to set
    const { error } = await supabase.from("property_documents").insert({
        id,
        property_id: propertyId,
        uploaded_by: userId,
        slot: upload.slot,
        file_path: path,
        file_name: upload.file_name,
        file_size_bytes: upload.file_size_bytes,
        mime_type: upload.mime_type,
    })

    if (error?.code === ROW_SECURITY_REFUSED) return null
    if (error) throw error
    return { id, path, file_name: upload.file_name }
}

/** The documents on a draft, oldest first. Returns null for an id that isn't a draft id. */
export async function listDocuments(supabase: SupabaseClient, propertyId: string): Promise<DraftDocument[] | null> {
    if (!propertyIdSchema.safeParse(propertyId).success) return null

    // Row level security leaves out other users' documents, so another user's draft lists as empty
    const { data, error } = await supabase
        .from("property_documents")
        .select(DOCUMENT_COLUMNS)
        .eq("property_id", propertyId)
        .order("created_at", { ascending: true })

    if (error) throw error
    return (data as DocumentRow[]).map(rowToDocument)
}

/**
 * Records what the user says a document is, or that they don't know (null).
 * Returns null when there is no such document the user can change.
 */
export async function setDeclaredType(
    supabase: SupabaseClient,
    propertyId: string,
    documentId: string,
    declaredType: PropertyDocumentType | null,
): Promise<DraftDocument | null> {
    if (!propertyIdSchema.safeParse(propertyId).success || !propertyIdSchema.safeParse(documentId).success) return null

    const { data, error } = await supabase
        .from("property_documents")
        .update({ declared_type: declaredType })
        .eq("id", documentId)
        .eq("property_id", propertyId)
        .select(DOCUMENT_COLUMNS)
        .maybeSingle<DocumentRow>()

    if (error) throw error
    return data ? rowToDocument(data) : null
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
