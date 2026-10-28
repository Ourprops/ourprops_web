import type { SupabaseClient } from "@supabase/supabase-js"

import { boundaryToGeoJSON, ringToCorners } from "@/lib/geo"
import { PROPERTY_DOCUMENTS_BUCKET } from "@/lib/storage/property-documents"
import {
    acquisitionDraftSchema,
    acquisitionMethodSchema,
    boundarySchema,
    boundarySourceSchema,
    propertyIdSchema,
    propertyTypeSchema,
    regionSchema,
    SUBMISSION_DECLARATION,
    type AcquisitionDraft,
    type BoundaryDraft,
    type Draft,
    type SavedDraft,
} from "@/lib/validators/property"

// Reads and writes property drafts as the signed-in user. Row level security limits each user to their own drafts.

const DRAFT_COLUMNS = "id, name, property_type, description, region, district_municipality, city_town, address, digital_address, landmark, acquisition_method, acquisition_metadata, updated_at, property_boundaries(boundary_geojson, source)"

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
    acquisition_method: string | null
    acquisition_metadata: unknown
    updated_at: string
    // A property has at most one boundary row, so it is embedded as an object
    property_boundaries: { boundary_geojson: unknown; source: string } | null
}

// Fields missing from the draft are left out so an update doesn't overwrite them; cleared fields are stored as null
function toColumn(value: string | undefined) {
    return value === undefined ? undefined : value || null
}

// A rule a draft breaks that the request schema can't check, such as a document belonging to another draft
export class InvalidDraftError extends Error {}

function acquisitionToColumns(acquisition: AcquisitionDraft | undefined) {
    if (acquisition === undefined) return {}
    return {
        acquisition_method: acquisition?.method ?? null,
        acquisition_metadata: acquisition?.metadata ?? null,
    }
}

function draftToRow({ details, location, acquisition }: Draft) {
    return {
        ...acquisitionToColumns(acquisition),
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

// The boundary is stored as GeoJSON; anything that no longer passes the checks is left unset
function rowToBoundary(row: DraftRow["property_boundaries"]): BoundaryDraft {
    if (!row) return null
    const shape = row.boundary_geojson as { type?: unknown; coordinates?: unknown } | null
    // Sources only reviewers set aren't used on drafts; should one turn up, the user sees the boundary as drawn
    const source = boundarySourceSchema.safeParse(row.source).data ?? "manual_draw"

    if (shape?.type === "Point" && Array.isArray(shape.coordinates)) {
        const pin = { longitude: shape.coordinates[0], latitude: shape.coordinates[1] }
        return boundarySchema.safeParse({ pin, source }).data ?? null
    }
    if (shape?.type === "Polygon" && Array.isArray(shape.coordinates) && Array.isArray(shape.coordinates[0])) {
        return boundarySchema.safeParse({ polygon: ringToCorners(shape.coordinates[0]), source }).data ?? null
    }
    return null
}

// An answer with metadata that no longer passes the checks keeps its method, so the user only answers the follow-ups again
function rowToAcquisition(row: DraftRow): AcquisitionDraft {
    const method = acquisitionMethodSchema.safeParse(row.acquisition_method).data
    if (!method) return null
    return (
        acquisitionDraftSchema.safeParse({ method, metadata: row.acquisition_metadata ?? {} }).data ??
        acquisitionDraftSchema.parse({ method, metadata: {} })
    )
}

// The document an answer points to, if any
function acquisitionDocument(acquisition: AcquisitionDraft | undefined) {
    return acquisition && "document" in acquisition.metadata ? acquisition.metadata.document : undefined
}

// An answer may only point to a document uploaded to the same draft, at the path recorded for it
async function checkAcquisitionDocument(supabase: SupabaseClient, draftId: string, acquisition: AcquisitionDraft | undefined) {
    const document = acquisitionDocument(acquisition)
    if (!document) return

    const { data, error } = await supabase
        .from("property_documents")
        .select("id")
        .eq("id", document.id)
        .eq("property_id", draftId)
        .eq("file_path", document.path)
        .maybeSingle()

    if (error) throw error
    if (!data) throw new InvalidDraftError("The uploaded document wasn't found. Upload it again.")
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
        boundary: rowToBoundary(row.property_boundaries),
        acquisition: rowToAcquisition(row),
    }
}

// Raised by save_draft_boundary when the draft doesn't exist or isn't the user's
const DRAFT_NOT_FOUND = "P0002"

// Arguments for save_draft_boundary, which checks the draft is the user's and the shape is valid before saving it
function boundaryArgs(id: string, boundary: BoundaryDraft) {
    return {
        draft_id: id,
        boundary: boundary && boundaryToGeoJSON(boundary),
        source: boundary?.source ?? "manual_draw",
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
    // Documents are uploaded to a draft that already exists
    if (acquisitionDocument(draft.acquisition)) {
        throw new InvalidDraftError("The uploaded document wasn't found. Upload it again.")
    }

    const { data, error } = await supabase
        .from("properties")
        .insert({ submitted_by: userId, ...draftToRow(draft) })
        .select(DRAFT_COLUMNS)
        .single<DraftRow>()

    if (error) throw error
    const saved = rowToSavedDraft(data)
    // A new draft has no boundary yet, so there is nothing to clear
    if (!draft.boundary) return saved

    // The boundary can only be saved once the draft exists
    const { error: boundaryError } = await supabase.rpc("save_draft_boundary", boundaryArgs(saved.id, draft.boundary))
    if (boundaryError) {
        // The client only learns the draft's id from a successful save and creates a new draft on its next save,
        // so remove this one rather than leave it behind as a duplicate
        await supabase.from("properties").delete().eq("id", saved.id).eq("status", "draft")
        throw boundaryError
    }
    return { ...saved, boundary: draft.boundary }
}

/** Returns null when there is no draft with this id that the user can edit */
export async function updateDraft(supabase: SupabaseClient, id: string, draft: Draft) {
    if (!propertyIdSchema.safeParse(id).success) return null

    await checkAcquisitionDocument(supabase, id, draft.acquisition)

    // The boundary goes first, so the draft read back below includes it
    if (draft.boundary !== undefined) {
        const { error } = await supabase.rpc("save_draft_boundary", boundaryArgs(id, draft.boundary))
        if (error?.code === DRAFT_NOT_FOUND) return null
        if (error) throw error
    }

    const row = draftToRow(draft)
    const properties = supabase.from("properties")
    // An update with no columns matches no rows, so when only the boundary changed the draft is just read back
    const query = Object.values(row).some((value) => value !== undefined)
        ? properties.update(row).select(DRAFT_COLUMNS)
        : properties.select(DRAFT_COLUMNS)
    const { data, error } = await query.eq("id", id).eq("status", "draft").maybeSingle<DraftRow>()

    if (error) throw error
    return data ? rowToSavedDraft(data) : null
}

// Raised by submit_property when a field the database requires is missing
const DRAFT_INCOMPLETE = "23514"

/**
 * Sends the draft for review once the user has confirmed their answers are accurate, and returns the slug it is given.
 * The declaration they confirmed is recorded with the submission.
 * Returns null when there is no draft with this id that the user can submit, such as one already submitted.
 */
export async function submitDraft(supabase: SupabaseClient, id: string): Promise<{ slug: string } | null> {
    if (!propertyIdSchema.safeParse(id).success) return null

    const { data, error } = await supabase.rpc("submit_property", { draft_id: id, declaration: SUBMISSION_DECLARATION })
    if (error?.code === DRAFT_NOT_FOUND) return null
    if (error?.code === DRAFT_INCOMPLETE) throw new InvalidDraftError(error.message)
    if (error) throw error
    return { slug: data as string }
}

/**
 * Deletes a draft, with every file uploaded to it. Returns false when there is no draft with this id the user can delete.
 * Only drafts are ever deleted: submitted properties are kept, and withdrawn instead (docs/admin.md, decision 17).
 * Row level security and the storage policies enforce that too.
 */
export async function deleteDraft(supabase: SupabaseClient, id: string): Promise<boolean> {
    if (!propertyIdSchema.safeParse(id).success) return false

    // Check first, so nothing is touched for a property that isn't the user's draft
    const { data: draft, error } = await supabase
        .from("properties")
        .select("id")
        .eq("id", id)
        .eq("status", "draft")
        .maybeSingle<{ id: string }>()
    if (error) throw error
    if (!draft) return false

    // The files go before the row: the storage policy only lets the user remove files while their draft exists,
    // so deleting the row first would leave them behind for good. If removing them fails, the draft is kept and
    // the user can try again.
    const paths = await draftFilePaths(supabase, id)
    if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(PROPERTY_DOCUMENTS_BUCKET).remove(paths)
        if (storageError) throw storageError
    }

    // Its boundary, document records and other rows that belong to it are deleted with it (on delete cascade)
    const { data: deleted, error: deleteError } = await supabase
        .from("properties")
        .delete()
        .eq("id", id)
        .eq("status", "draft")
        .select("id")
        .maybeSingle<{ id: string }>()
    if (deleteError) throw deleteError
    return deleted !== null
}

// Every file in the draft's folder. Listed from storage rather than read from the document records, so a file whose
// record is already gone (such as one whose removal failed earlier) is found too.
async function draftFilePaths(supabase: SupabaseClient, id: string): Promise<string[]> {
    const bucket = supabase.storage.from(PROPERTY_DOCUMENTS_BUCKET)
    // Paths are lowercase (propertyDocumentPath), and each file sits at <property id>/<document id>/<file name>
    const folder = id.toLowerCase()

    const { data: documentFolders, error } = await bucket.list(folder, { limit: 1000 })
    if (error) throw error

    const files = await Promise.all(
        documentFolders.map(async (documentFolder) => {
            const { data, error: listError } = await bucket.list(`${folder}/${documentFolder.name}`, { limit: 1000 })
            if (listError) throw listError
            return data.map((file) => `${folder}/${documentFolder.name}/${file.name}`)
        })
    )
    return files.flat()
}
