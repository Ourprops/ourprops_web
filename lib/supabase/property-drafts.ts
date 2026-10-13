import type { SupabaseClient } from "@supabase/supabase-js"

import { propertyIdSchema, propertyTypeSchema, regionSchema, type Draft, type SavedDraft } from "@/lib/validators/property"

// Reads and writes property drafts as the signed-in user. Row level security limits each user to their own drafts.

const DRAFT_COLUMNS = "id, name, property_type, description, region, district_municipality, city_town, address, digital_address, landmark, updated_at"

type DraftRow = {
    id: string
    name: string | null
    property_type: string | null
    description: string | null
    region: string | null
    district_municipality: string | null
    city_town: string | null
    address: string | null
    digital_address: string | null
    landmark: string | null
    updated_at: string
}

// Fields missing from the draft are left out so an update doesn't overwrite them; cleared fields are stored as null
function toColumn(value: string | undefined) {
    return value === undefined ? undefined : value || null
}

function draftToRow({ details, location }: Draft) {
    return {
        name: toColumn(details.name),
        property_type: details.type,
        description: toColumn(details.description),
        region: location.region,
        district_municipality: toColumn(location.municipality),
        city_town: toColumn(location.city),
        address: toColumn(location.address),
        digital_address: toColumn(location.digital_address),
        landmark: toColumn(location.landmark),
    }
}

function rowToSavedDraft(row: DraftRow): SavedDraft {
    return {
        id: row.id,
        updatedAt: row.updated_at,
        details: {
            name: row.name ?? undefined,
            // Older rows may hold a type the form no longer offers; leave it unset so the user picks again
            type: propertyTypeSchema.safeParse(row.property_type).data,
            description: row.description ?? undefined,
        },
        location: {
            // Same for regions: an unknown value is left unset
            region: regionSchema.safeParse(row.region).data,
            municipality: row.district_municipality ?? undefined,
            city: row.city_town ?? undefined,
            address: row.address ?? undefined,
            digital_address: row.digital_address ?? undefined,
            landmark: row.landmark ?? undefined,
        },
    }
}

export async function getDraft(supabase: SupabaseClient, id: string) {
    if (!propertyIdSchema.safeParse(id).success) return null

    const { data, error } = await supabase
        .from("properties")
        .select(DRAFT_COLUMNS)
        .eq("id", id)
        .eq("status", "draft")
        .maybeSingle<DraftRow>()

    if (error) throw error
    return data ? rowToSavedDraft(data) : null
}

export async function createDraft(supabase: SupabaseClient, userId: string, draft: Draft) {
    const { data, error } = await supabase
        .from("properties")
        .insert({ submitted_by: userId, ...draftToRow(draft) })
        .select(DRAFT_COLUMNS)
        .single<DraftRow>()

    if (error) throw error
    return rowToSavedDraft(data)
}

/** Returns null when there is no draft with this id that the user can edit */
export async function updateDraft(supabase: SupabaseClient, id: string, draft: Draft) {
    if (!propertyIdSchema.safeParse(id).success) return null

    const { data, error } = await supabase
        .from("properties")
        .update(draftToRow(draft))
        .eq("id", id)
        .eq("status", "draft")
        .select(DRAFT_COLUMNS)
        .maybeSingle<DraftRow>()

    if (error) throw error
    return data ? rowToSavedDraft(data) : null
}
