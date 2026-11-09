import type { createClient } from "@/lib/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

/** What an owner sees about their own identity document. The number and the photo aren't read: the page doesn't show them. */
export type OwnIdentityDocument = {
    document_type: "ghana_card" | "passport"
    issuing_country: string
    expires_on: string
    verification_status: "unreviewed" | "verified" | "rejected"
    // Why it wasn't accepted, written for the owner
    review_note: string | null
    // When it was last saved, which is when it was sent for checking
    updated_at: string
    verified_at: string | null
}

/** The signed-in owner's identity document, or null if they haven't saved one. Row level security limits it to their own. */
export async function getOwnIdentityDocument(supabase: Supabase, profileId: string): Promise<OwnIdentityDocument | null> {
    const { data, error } = await supabase
        .from("identity_documents")
        .select("document_type, issuing_country, expires_on, verification_status, review_note, updated_at, verified_at")
        .eq("profile_id", profileId)
        .maybeSingle<OwnIdentityDocument>()
    if (error) throw error
    return data
}
