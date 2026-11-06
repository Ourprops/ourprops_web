"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { GENERIC_ACTION_ERROR, type ActionState } from "@/lib/action-errors"
import { IDENTITY_DOCUMENTS_BUCKET } from "@/lib/storage/identity-documents"
import { createClient } from "@/lib/supabase/server"
import { identityDocumentSchema } from "@/lib/validators/identity"

// save_identity_document raises these with messages written for the owner: the number is on another account (23505),
// the document has expired or is already verified (23514), or the photo isn't in their folder (P0002)
const SHOWABLE_CODES = new Set(["23505", "23514", "P0002"])

// Saves the owner's identity document after the browser has uploaded its photo to their own folder. A public POST
// endpoint like any server action, so it checks the caller itself; save_identity_document decides the rest.
//
// This is national ID data, so it is never logged: only an error's code and message are, never its details, which
// for a constraint violation hold the whole row, number included.
export async function saveIdentityDocument(formData: FormData): Promise<ActionState> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub
    if (!userId) {
        redirect("/account/login")
    }

    const parsed = identityDocumentSchema.safeParse({
        documentType: formData.get("document_type"),
        issuingCountry: formData.get("issuing_country") ?? "",
        documentNumber: formData.get("document_number") ?? "",
        expiresOn: formData.get("expires_on"),
        filePath: formData.get("file_path") ?? "",
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }
    const document = parsed.data

    // The database checks the folder too; this keeps a request for someone else's file from getting that far
    if (!document.filePath.startsWith(`${userId}/`)) {
        return { error: "Upload a photo or scan of the document." }
    }

    // Read before saving, so the photo this one replaces can be removed afterwards
    const { data: existing } = await supabase
        .from("identity_documents")
        .select("file_path")
        .eq("profile_id", userId)
        .maybeSingle<{ file_path: string | null }>()

    const { error } = await supabase.rpc("save_identity_document", {
        document_type: document.documentType,
        issuing_country: document.issuingCountry,
        document_number: document.documentNumber,
        expires_on: document.expiresOn,
        file_path: document.filePath,
    })
    if (error) {
        console.error("save_identity_document failed", { code: error.code, message: error.message })
        return { error: error.code && SHOWABLE_CODES.has(error.code) ? error.message : GENERIC_ACTION_ERROR }
    }

    // Nothing points to the old photo now, so the owner's own delete policy allows removing it. Failing to is only
    // untidy: the file stays private to them.
    if (existing?.file_path && existing.file_path !== document.filePath) {
        const { error: removeError } = await supabase.storage.from(IDENTITY_DOCUMENTS_BUCKET).remove([existing.file_path])
        if (removeError) {
            console.error("Removing a replaced identity photo failed", { message: removeError.message })
        }
    }

    refresh()
    return null
}
