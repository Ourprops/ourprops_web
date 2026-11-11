import type { createClient } from "@/lib/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

export type PublicRecord = {
    prop_id: string
    name: string | null
    property_type: string
    city_town: string | null
    district_municipality: string | null
    region: string | null
    area_sqm: number | null
    // where area_sqm comes from: the site plan, checked by an admin, or the boundary the owner drew, not checked
    area_source: "site_plan" | "owner_map" | null
    status: "active" | "suspended"
    verified_at: string | null
    checkpoints: { key: string; status: string; note: string | null }[] | null
}

/** A verified property's public record, or null if there's no public record at that reference */
export async function getPublicRecord(supabase: Supabase, reference: string): Promise<PublicRecord | null> {
    // References are PROP- and six letters or digits; anything else can't be one, so the database isn't asked
    if (!/^PROP-[A-Za-z0-9]{1,12}$/.test(reference)) return null

    const { data, error } = await supabase.rpc("public_property_record", { reference })
    if (error) throw error
    const [record] = (data ?? []) as PublicRecord[]
    return record ?? null
}

// What each check means, in words for someone deciding whether to trust the property. In the order they are shown.
export const PUBLIC_CHECKS: { key: string; title: string; text: string }[] = [
    { key: "identity_verified", title: "The owner's identity", text: "The person who registered it showed us a valid Ghana Card or passport." },
    { key: "ownership_claim_verified", title: "The ownership documents", text: "Their documents support their claim to the property." },
    { key: "boundary_mapped", title: "The boundary", text: "The property's boundary is mapped." },
    { key: "cadastral_cross_check", title: "Survey records", text: "The boundary agrees with the survey or cadastral plan." },
    { key: "overlap_clearance", title: "No overlapping claims", text: "It doesn't overlap another property registered with us." },
    { key: "official_search_status", title: "Lands Commission search", text: "An official search on the land was considered." },
    { key: "encumbrance_clearance", title: "Court cases and charges", text: "No open court case or charge on the property blocks it." },
]

/** Square metres, with acres alongside, as land in Ghana is usually talked about in acres or plots */
export function describeArea(squareMetres: number) {
    const acres = squareMetres / 4046.8564224
    return `${Math.round(squareMetres).toLocaleString("en-GB")} m² (about ${acres < 10 ? acres.toFixed(2) : Math.round(acres)} acres)`
}

/** The record's area in words that say how far to trust it: checked against the site plan, or the owner's sketch */
export function describeRecordArea(record: Pick<PublicRecord, "area_sqm" | "area_source">) {
    if (!record.area_sqm || !record.area_source) return null
    return record.area_source === "site_plan"
        ? { text: describeArea(record.area_sqm), source: "from the site plan, checked by OurProps", checked: true }
        : { text: `About ${describeArea(record.area_sqm)}`, source: "drawn on a map by the owner, not checked", checked: false }
}
