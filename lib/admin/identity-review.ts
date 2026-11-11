// The admin's side of identity documents (docs/admin.md, section 5): opening the owner's photo, and deleting it once
// the document is verified. Everything runs as the admin: the storage policies let them read a photo waiting for
// review, and delete a verified document's photo, and nothing else in the bucket. The service role isn't used.
//
// This is national ID data. Nothing here logs a path, a number or an error's details.

import type { DocumentView } from "@/lib/admin/document-preview"
import { matchesDeclaredType } from "@/lib/admin/document-type"
import type { requireAdmin } from "@/lib/auth/staff"
import { IDENTITY_DOCUMENTS_BUCKET } from "@/lib/storage/identity-documents"

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"]

// Short: the photo is national ID, and the viewer loads it straight away
const SIGNED_URL_SECONDS = 2 * 60

// What the identity bucket takes, all of which a browser displays (20261106130000_identity_documents_no_heic.sql)
const VIEWABLE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"])

export const IDENTITY_ERRORS = {
    notFound: "Identity document not found.",
    notWaiting: "Only a document waiting for review can be opened.",
    missingFile: "The photo isn't in storage. Ask the owner to add their document again.",
    mismatch: "This file isn't what it claims to be, so it won't be opened. Reject the document and ask for a clear photo.",
    generic: "The photo couldn't be opened. Try again.",
    photoNotDeleted: "The document is verified, but its photo couldn't be deleted yet. Use “Delete the photo” to try again.",
} as const

type IdentityRow = { verification_status: string; file_path: string | null }

async function readDocument(supabase: Supabase, profileId: string) {
    const { data, error } = await supabase
        .from("identity_documents")
        .select("verification_status, file_path")
        .eq("profile_id", profileId)
        .maybeSingle<IdentityRow>()
    if (error) console.error("Reading an identity document failed", { code: error.code })
    return data
}

/**
 * Opens the photo of a document waiting for review. Checked every time rather than recorded, as there is no
 * conversion to save: the file must start the way the type it was stored with says, and that type must be one a
 * browser displays safely.
 */
export async function openIdentityPhoto(supabase: Supabase, profileId: string): Promise<DocumentView> {
    const document = await readDocument(supabase, profileId)
    if (!document?.file_path) return { error: IDENTITY_ERRORS.notFound }
    if (document.verification_status !== "unreviewed") return { error: IDENTITY_ERRORS.notWaiting }

    const storage = supabase.storage.from(IDENTITY_DOCUMENTS_BUCKET)
    const { data: file, error } = await storage.download(document.file_path)
    if (error || !file) return { error: IDENTITY_ERRORS.missingFile }

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!VIEWABLE.has(file.type) || !matchesDeclaredType(bytes, file.type)) {
        console.warn("An identity photo's contents don't match its type", { stored: file.type })
        return { error: IDENTITY_ERRORS.mismatch }
    }

    const { data: signed, error: signError } = await storage.createSignedUrl(document.file_path, SIGNED_URL_SECONDS)
    if (signError || !signed) return { error: IDENTITY_ERRORS.generic }
    return { kind: file.type === "application/pdf" ? "pdf" : "image", url: signed.signedUrl }
}

/**
 * Deletes a verified document's photo, then has the database forget it. forget_identity_photo refuses while the file
 * is still in storage, so the record never says a photo is gone when it isn't. Returns false if either step failed;
 * the document stays verified, its photo still listed, and the console offers to try again.
 */
export async function deleteIdentityPhoto(supabase: Supabase, profileId: string): Promise<boolean> {
    const document = await readDocument(supabase, profileId)
    if (!document || document.verification_status !== "verified") return false
    if (!document.file_path) return true

    // remove() reports no error for a file it didn't delete, whether the policies refused or an earlier try already
    // deleted it, so its answer isn't trusted either way: forget_identity_photo checks the file is really gone
    const { error } = await supabase.storage.from(IDENTITY_DOCUMENTS_BUCKET).remove([document.file_path])
    if (error) {
        console.error("Deleting a verified identity photo failed", { message: error.message })
        return false
    }

    const { error: forgetError } = await supabase.rpc("forget_identity_photo", { profile_id: profileId })
    if (forgetError) {
        console.error("forget_identity_photo failed", { code: forgetError.code, message: forgetError.message })
        return false
    }
    return true
}
