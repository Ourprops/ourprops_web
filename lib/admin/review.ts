import type { SupabaseClient } from "@supabase/supabase-js"

import { propertyIdSchema } from "@/lib/validators/property"

// Reads for the admin console, as the signed-in admin. Get the client from requireAdmin(), so these never run
// for anyone else; row level security limits them to admins with a second factor all the same.

// Properties an admin still has to act on
export const QUEUE_STATUSES = ["submitted", "under_review", "action_required"] as const

const OPEN_OVERLAP_STATUSES = ["detected", "investigating"]

export type QueueItem = {
    id: string
    propId: string
    name: string
    status: string
    place: string
    ownerName: string
    // When the owner submitted it; null only if the audit entry is missing
    submittedAt: string | null
    // The admin who last started its review
    reviewerName: string | null
    hasBoundary: boolean
    documentCount: number
    openOverlaps: number
}

type QueuePropertyRow = {
    id: string
    prop_id: string
    name: string | null
    status: string
    region: string | null
    city_town: string | null
    owner: { full_name: string } | null
    property_boundaries: { id: string } | null
    property_documents: { count: number }[]
}

type QueueAuditRow = {
    property_id: string
    action: string
    created_at: string
    actor: { full_name: string } | null
}

type OverlapPairRow = {
    property_id: string
    conflicting_property_id: string
}

// Puts the queue together and sorts it oldest submission first; kept apart from the queries so it can be tested
export function buildQueue(
    properties: QueuePropertyRow[],
    auditRows: QueueAuditRow[],
    openFlags: OverlapPairRow[]
): QueueItem[] {
    const submittedAt = new Map<string, string>()
    const reviewer = new Map<string, string | null>()

    // auditRows are oldest first, so the first submission and the latest review win
    for (const row of auditRows) {
        if (row.action === "property_submitted" && !submittedAt.has(row.property_id)) {
            submittedAt.set(row.property_id, row.created_at)
        }
        if (row.action === "property_review_started") {
            reviewer.set(row.property_id, row.actor?.full_name ?? null)
        }
    }

    const overlaps = new Map<string, number>()
    for (const flag of openFlags) {
        for (const id of [flag.property_id, flag.conflicting_property_id]) {
            overlaps.set(id, (overlaps.get(id) ?? 0) + 1)
        }
    }

    const items = properties.map((row) => ({
        id: row.id,
        propId: row.prop_id,
        name: row.name ?? "Untitled property",
        status: row.status,
        place: [row.city_town, row.region].filter(Boolean).join(", "),
        ownerName: row.owner?.full_name ?? "Unknown owner",
        submittedAt: submittedAt.get(row.id) ?? null,
        reviewerName: reviewer.get(row.id) ?? null,
        hasBoundary: row.property_boundaries !== null,
        documentCount: row.property_documents[0]?.count ?? 0,
        openOverlaps: overlaps.get(row.id) ?? 0,
    }))

    // Oldest first; anything without a submission date goes last rather than jumping the queue
    return items.sort((a, b) => {
        if (a.submittedAt === b.submittedAt) return 0
        if (a.submittedAt === null) return 1
        if (b.submittedAt === null) return -1
        return a.submittedAt.localeCompare(b.submittedAt)
    })
}

export async function getReviewQueue(supabase: SupabaseClient): Promise<QueueItem[]> {
    const { data: properties, error } = await supabase
        .from("properties")
        .select(
            "id, prop_id, name, status, region, city_town, owner:profiles!properties_submitted_by_fkey(full_name), property_boundaries(id), property_documents(count)"
        )
        .in("status", QUEUE_STATUSES)
    if (error) throw error

    const rows = (properties ?? []) as unknown as QueuePropertyRow[]
    if (rows.length === 0) return []
    const ids = rows.map((row) => row.id)

    const [audit, flags] = await Promise.all([
        supabase
            .from("audit_logs")
            .select("property_id, action, created_at, actor:profiles!audit_logs_actor_id_fkey(full_name)")
            .in("property_id", ids)
            .in("action", ["property_submitted", "property_review_started"])
            .order("created_at", { ascending: true }),
        // Few flags are ever open, so all are fetched and counted here rather than filtered per property
        supabase
            .from("property_overlap_flags")
            .select("property_id, conflicting_property_id")
            .in("status", OPEN_OVERLAP_STATUSES),
    ])
    if (audit.error) throw audit.error
    if (flags.error) throw flags.error

    return buildQueue(
        rows,
        (audit.data ?? []) as unknown as QueueAuditRow[],
        (flags.data ?? []) as OverlapPairRow[]
    )
}

export type PropertyForReview = {
    property: {
        id: string
        prop_id: string
        name: string | null
        status: string
        property_type: string | null
        description: string | null
        region: string | null
        district_municipality: string | null
        city_town: string | null
        address: string | null
        digital_address: string | null
        landmark: string | null
        acquisition_method: string | null
        acquisition_metadata: unknown
        ownership_type: string | null
        ownership_structure: string | null
        created_at: string
        updated_at: string
        owner: { id: string; full_name: string; phone_number: string | null } | null
        property_boundaries: { source: string; area_sqm: number | null } | null
    }
    identity: {
        document_type: string
        issuing_country: string
        expires_on: string
        verification_status: string
        verified_at: string | null
    } | null
    documents: {
        id: string
        slot: string | null
        declared_type: string | null
        document_type: string
        verification_status: string
        file_name: string
        created_at: string
    }[]
    checkpoints: {
        checkpoint_key: string
        status: string
        public_notes: string | null
        internal_notes: string | null
        verified_at: string | null
        verifier: { full_name: string } | null
    }[]
    encumbrances: {
        id: string
        kind: string
        reference: string
        blocks_activation: boolean
        status: string
        internal_notes: string | null
        created_at: string
        resolved_at: string | null
        recorder: { full_name: string } | null
    }[]
    overlaps: {
        id: string
        status: string
        overlap_area_sqm: number | null
        overlap_percentage_subject: number | null
        created_at: string
        // The other property in the pair, whichever side of the flag it is on
        otherPropertyId: string
    }[]
    history: {
        id: string
        action: string
        metadata: Record<string, unknown> | null
        created_at: string
        actor: { full_name: string } | null
    }[]
}

// Everything the property review page shows. Null when there is no such property, or it is still a draft:
// admins can't read drafts, so the two look the same.
export async function getPropertyForReview(supabase: SupabaseClient, id: string): Promise<PropertyForReview | null> {
    // The id goes into a filter string below, so only a real uuid gets that far
    if (!propertyIdSchema.safeParse(id).success) return null

    const { data: property, error } = await supabase
        .from("properties")
        .select(
            "id, prop_id, name, status, property_type, description, region, district_municipality, city_town, address, digital_address, landmark, acquisition_method, acquisition_metadata, ownership_type, ownership_structure, created_at, updated_at, owner:profiles!properties_submitted_by_fkey(id, full_name, phone_number), property_boundaries(source, area_sqm)"
        )
        .eq("id", id)
        .maybeSingle()
    if (error) throw error
    if (!property) return null

    const row = property as unknown as PropertyForReview["property"]

    const [identity, documents, checkpoints, encumbrances, flags, history] = await Promise.all([
        row.owner
            ? supabase
                  .from("identity_documents")
                  .select("document_type, issuing_country, expires_on, verification_status, verified_at")
                  .eq("profile_id", row.owner.id)
                  .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        supabase
            .from("property_documents")
            .select("id, slot, declared_type, document_type, verification_status, file_name, created_at")
            .eq("property_id", id)
            .order("created_at", { ascending: true }),
        supabase
            .from("property_checkpoints")
            .select(
                "checkpoint_key, status, public_notes, internal_notes, verified_at, verifier:profiles!property_checkpoints_verified_by_fkey(full_name)"
            )
            .eq("property_id", id),
        supabase
            .from("property_encumbrances")
            .select(
                "id, kind, reference, blocks_activation, status, internal_notes, created_at, resolved_at, recorder:profiles!property_encumbrances_recorded_by_fkey(full_name)"
            )
            .eq("property_id", id)
            .order("created_at", { ascending: true }),
        supabase
            .from("property_overlap_flags")
            .select("id, property_id, conflicting_property_id, status, overlap_area_sqm, overlap_percentage_subject, created_at")
            .or(`property_id.eq.${id},conflicting_property_id.eq.${id}`)
            .order("created_at", { ascending: true }),
        supabase
            .from("audit_logs")
            .select("id, action, metadata, created_at, actor:profiles!audit_logs_actor_id_fkey(full_name)")
            .eq("property_id", id)
            .order("created_at", { ascending: false }),
    ])

    for (const result of [identity, documents, checkpoints, encumbrances, flags, history]) {
        if (result.error) throw result.error
    }

    const flagRows = (flags.data ?? []) as (OverlapPairRow & Omit<PropertyForReview["overlaps"][number], "otherPropertyId">)[]

    return {
        property: row,
        identity: (identity.data ?? null) as PropertyForReview["identity"],
        documents: (documents.data ?? []) as PropertyForReview["documents"],
        checkpoints: (checkpoints.data ?? []) as unknown as PropertyForReview["checkpoints"],
        encumbrances: (encumbrances.data ?? []) as unknown as PropertyForReview["encumbrances"],
        overlaps: flagRows.map(({ property_id, conflicting_property_id, ...flag }) => ({
            ...flag,
            otherPropertyId: property_id === id ? conflicting_property_id : property_id,
        })),
        history: (history.data ?? []) as unknown as PropertyForReview["history"],
    }
}
