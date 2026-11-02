import type { SupabaseClient } from "@supabase/supabase-js"

import { propertyIdSchema } from "@/lib/validators/property"

// Reads for the owner's own properties, as the signed-in owner. Row level security limits them to the owner's own
// rows; the queries also filter on the owner, because an admin's session can read other people's properties.

// What owners see for each status (docs/admin.md, section 5, "What owners see")
export const OWNER_STATUS_LABELS: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted. We'll start reviewing soon.",
    under_review: "In review",
    action_required: "We need something from you",
    active: "Your property is verified",
    suspended: "Your property's verification is paused",
}

export type OwnPropertySummary = {
    id: string
    name: string | null
    status: string
    updated_at: string
}

/** The owner's properties, most recently changed first */
export async function listOwnProperties(supabase: SupabaseClient, ownerId: string): Promise<OwnPropertySummary[]> {
    const { data, error } = await supabase
        .from("properties")
        .select("id, name, status, updated_at")
        .eq("submitted_by", ownerId)
        .order("updated_at", { ascending: false })

    if (error) throw error
    return (data ?? []) as OwnPropertySummary[]
}

export type OwnProperty = {
    id: string
    name: string | null
    status: string
    suspension_reason: string | null
    changes_requested_message: string | null
    identity_requested: boolean
    // What the admin asked for that the owner hasn't sent back yet, oldest first
    openRequests: { id: string; slot: string; note: string; created_at: string }[]
    // Documents uploaded since a request for their checklist item: the ones the owner can still take back
    uploads: { id: string; slot: string; file_name: string }[]
}

type DocumentRow = { id: string; slot: string; file_name: string; created_at: string }

/** One of the owner's properties with what is asked of them, or null if there is no such property of theirs */
export async function getOwnProperty(supabase: SupabaseClient, ownerId: string, id: string): Promise<OwnProperty | null> {
    if (!propertyIdSchema.safeParse(id).success) return null

    const { data: property, error } = await supabase
        .from("properties")
        .select("id, name, status, suspension_reason, changes_requested_message, identity_requested")
        .eq("id", id)
        .eq("submitted_by", ownerId)
        .maybeSingle()
    if (error) throw error
    if (!property) return null

    const [requests, documents] = await Promise.all([
        supabase
            .from("property_document_requests")
            .select("id, slot, note, created_at")
            .eq("property_id", id)
            .is("fulfilled_at", null)
            .order("created_at", { ascending: true }),
        supabase
            .from("property_documents")
            .select("id, slot, file_name, created_at")
            .eq("property_id", id)
            .order("created_at", { ascending: true }),
    ])
    if (requests.error) throw requests.error
    if (documents.error) throw documents.error

    const openRequests = (requests.data ?? []) as OwnProperty["openRequests"]
    const uploads = requestedUploads(openRequests, (documents.data ?? []) as DocumentRow[])

    return { ...(property as Omit<OwnProperty, "openRequests" | "uploads">), openRequests, uploads }
}

/**
 * The documents that answer an open request: in a requested checklist item, uploaded since it was asked for.
 * The same rule as answers_open_request in the database, which is what actually decides; this only chooses
 * what the page lists under each request.
 */
export function requestedUploads(
    openRequests: Pick<OwnProperty["openRequests"][number], "slot" | "created_at">[],
    documents: DocumentRow[]
): OwnProperty["uploads"] {
    const requestedSince = new Map<string, number>()
    for (const request of openRequests) {
        const asked = Date.parse(request.created_at)
        const earliest = requestedSince.get(request.slot)
        if (earliest === undefined || asked < earliest) requestedSince.set(request.slot, asked)
    }

    return documents
        .filter((document) => {
            const since = requestedSince.get(document.slot)
            return since !== undefined && Date.parse(document.created_at) >= since
        })
        .map(({ id, slot, file_name }) => ({ id, slot, file_name }))
}
