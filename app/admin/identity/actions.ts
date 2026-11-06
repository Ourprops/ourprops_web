"use server"

import { actionErrorMessage, type ActionState } from "@/lib/action-errors"
import { requireAdmin } from "@/lib/auth/staff"
import { IDENTITY_DOCUMENTS_BUCKET } from "@/lib/storage/identity-documents"
import { createClient as createServiceRoleClient } from "@/lib/supabase/service-role"
import { identityReleaseSchema } from "@/lib/validators/admin"
import { identityLookupSchema } from "@/lib/validators/identity"

// Finding the account that holds an identity document, and releasing it so its rightful owner can save it
// (docs/admin.md, section 5). Every action checks the caller itself, first. National ID data: the number is never
// logged, and errors are logged by code and message only.

export type IdentityHolder = {
    profile_id: string
    full_name: string
    email: string | null
    phone_number: string | null
    verification_status: string
}

export type LookupState = { holder: IdentityHolder | null; searched: boolean } | { error: string } | null

// Looks up who holds a document by its number. A POST, not a search in the URL, so the number stays out of server
// logs and browser history. find_identity_document_holder audits every lookup.
export async function findIdentityHolder(_previous: LookupState, formData: FormData): Promise<LookupState> {
    const { supabase } = await requireAdmin()

    const parsed = identityLookupSchema.safeParse({
        documentType: formData.get("document_type"),
        issuingCountry: formData.get("issuing_country") ?? "",
        documentNumber: formData.get("document_number") ?? "",
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { data, error } = await supabase.rpc("find_identity_document_holder", {
        document_type: parsed.data.documentType,
        issuing_country: parsed.data.issuingCountry,
        document_number: parsed.data.documentNumber,
    })
    if (error) {
        console.error("find_identity_document_holder failed", { code: error.code, message: error.message })
        return { error: actionErrorMessage(error) }
    }

    const [holder] = (data ?? []) as IdentityHolder[]
    return { holder: holder ?? null, searched: true }
}

export type ReleaseState = ActionState | { released: true }

// Releases the account's document. If its photo is still in storage (it wasn't verified yet), that one file is then
// deleted with the service role: with the document's row gone, no admin policy covers it any more. The path comes
// from the database, and must be in that account's own folder.
export async function releaseIdentityDocument(profileId: string, _previous: ReleaseState, formData: FormData): Promise<ReleaseState> {
    const { supabase } = await requireAdmin()

    const parsed = identityReleaseSchema.safeParse({ profileId, reason: formData.get("reason") ?? "" })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { data: photoPath, error } = await supabase.rpc("release_identity_document", {
        profile_id: parsed.data.profileId,
        reason: parsed.data.reason,
    })
    if (error) {
        console.error("release_identity_document failed", { code: error.code, message: error.message })
        return { error: actionErrorMessage(error) }
    }

    if (typeof photoPath === "string" && photoPath.startsWith(`${parsed.data.profileId}/`)) {
        const { error: removeError } = await createServiceRoleClient().storage.from(IDENTITY_DOCUMENTS_BUCKET).remove([photoPath])
        if (removeError) {
            console.error("Deleting a released identity photo failed", { profileId: parsed.data.profileId, message: removeError.message })
            return { error: "The document is released, but its photo couldn't be deleted. Tell a developer, with the account's email." }
        }
    }

    return { released: true }
}
