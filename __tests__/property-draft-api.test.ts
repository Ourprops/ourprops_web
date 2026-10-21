import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { NextRequest } from 'next/server'

import { POST } from '../app/api/property/draft/route'
import { PATCH } from '../app/api/property/draft/[id]/route'
import { POST as SUBMIT } from '../app/api/property/draft/[id]/submit/route'
import { getDraft } from '../lib/supabase/property-drafts'

const DRAFT_ID = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const USER_ID = '11111111-1111-4111-8111-111111111111'

// A saved row as Supabase returns it
const ROW = {
    id: DRAFT_ID,
    name: 'East Legon house',
    property_type: 'residential',
    description: null,
    region: 'Greater Accra',
    district_municipality: 'Ayawaso West',
    city_town: 'East Legon',
    address: null,
    digital_address: 'GA-123-4567',
    landmark: null,
    acquisition_method: null as string | null,
    acquisition_metadata: null as unknown,
    updated_at: '2026-10-13T12:00:00.000000+00:00',
    property_boundaries: null as { boundary_geojson: unknown; source: string } | null,
}

// Records what each query was asked to do and resolves with `result`
const query = {
    calls: [] as { method: string; args: unknown[] }[],
    result: { data: ROW as unknown, error: null as unknown },
    rpcResult: { data: null as unknown, error: null as unknown },
    // Results for a particular table, such as property_documents, when it should differ from `result`
    tableResults: {} as Record<string, { data: unknown; error: unknown }>,
}
let user: { id: string } | null = { id: USER_ID }

function builder(table: string) {
    const chain: Record<string, unknown> = {}
    for (const method of ['insert', 'update', 'delete', 'select', 'eq']) {
        chain[method] = (...args: unknown[]) => {
            query.calls.push({ method, args })
            return chain
        }
    }
    chain.single = async () => query.tableResults[table] ?? query.result
    chain.maybeSingle = async () => query.tableResults[table] ?? query.result
    return chain
}

const supabase = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) => {
        query.calls.push({ method: 'from', args: [table] })
        return builder(table)
    },
    rpc: async (...args: unknown[]) => {
        query.calls.push({ method: 'rpc', args })
        return query.rpcResult
    },
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => supabase,
}))

function request(body: unknown) {
    return new Request('http://localhost/api/property/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    }) as unknown as NextRequest
}

function patch(id: string, body: unknown) {
    return PATCH(request(body), { params: Promise.resolve({ id }) })
}

function callsTo(method: string) {
    return query.calls.filter((call) => call.method === method).map((call) => call.args)
}

const VALID_BODY = {
    details: { name: '  East Legon house  ', type: 'residential', description: '' },
    location: { region: 'Greater Accra', municipality: 'Ayawaso West', city: 'East Legon', digital_address: 'GA-123-4567' },
}

const SAVED_DRAFT = {
    id: DRAFT_ID,
    updatedAt: ROW.updated_at,
    details: { name: 'East Legon house', type: 'residential', description: undefined },
    location: {
        region: 'Greater Accra',
        municipality: 'Ayawaso West',
        city: 'East Legon',
        address: undefined,
        digital_address: 'GA-123-4567',
        landmark: undefined,
    },
    boundary: null,
    acquisition: null,
}

beforeEach(() => {
    query.calls = []
    query.result = { data: ROW, error: null }
    query.rpcResult = { data: null, error: null }
    query.tableResults = {}
    user = { id: USER_ID }
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('POST /api/property/draft', () => {
    test('creates a draft for the signed-in user and maps fields to columns', async () => {
        const response = await POST(request(VALID_BODY))

        expect(response.status).toBe(201)
        expect(await response.json()).toEqual(JSON.parse(JSON.stringify(SAVED_DRAFT)))
        expect(callsTo('from')).toEqual([['properties']])
        expect(callsTo('insert')).toEqual([[{
            submitted_by: USER_ID,
            // Text is trimmed and a cleared field is stored as null
            name: 'East Legon house',
            property_type: 'residential',
            description: null,
            region: 'Greater Accra',
            district_municipality: 'Ayawaso West',
            city_town: 'East Legon',
            address: undefined,
            digital_address: 'GA-123-4567',
            landmark: undefined,
        }]])
    })

    test('accepts an empty draft', async () => {
        const response = await POST(request({ details: {}, location: {} }))

        expect(response.status).toBe(201)
    })

    test('saves a half-typed digital address without checking its format', async () => {
        const response = await POST(request({ details: {}, location: { digital_address: 'GA-12' } }))

        expect(response.status).toBe(201)
        expect(callsTo('insert')[0][0]).toMatchObject({ digital_address: 'GA-12' })
    })

    test('returns 401 when nobody is signed in', async () => {
        user = null

        const response = await POST(request(VALID_BODY))

        expect(response.status).toBe(401)
        expect(callsTo('insert')).toEqual([])
    })

    test.each([
        ['malformed JSON', '{not json'],
        ['a missing section', { details: {} }],
        ['an unknown field', { details: { colour: 'blue' }, location: {} }],
        ['an unknown property type', { details: { type: 'castle' }, location: {} }],
        ['an unknown region', { details: {}, location: { region: 'Mars' } }],
    ])('returns 400 for %s', async (_, body) => {
        const response = await POST(request(body))

        expect(response.status).toBe(400)
        expect((await response.json()).error.message).toEqual(expect.any(String))
        expect(callsTo('insert')).toEqual([])
    })

    test('returns 500 when the insert fails', async () => {
        query.result = { data: null, error: { message: 'permission denied' } }

        const response = await POST(request(VALID_BODY))

        expect(response.status).toBe(500)
    })
})

describe('PATCH /api/property/draft/[id]', () => {
    test('updates only that draft, and only while it is still a draft', async () => {
        const response = await patch(DRAFT_ID, VALID_BODY)

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(JSON.parse(JSON.stringify(SAVED_DRAFT)))
        expect(callsTo('update')[0][0]).toMatchObject({ name: 'East Legon house', city_town: 'East Legon' })
        expect(callsTo('eq')).toEqual([['id', DRAFT_ID], ['status', 'draft']])
    })

    test('leaves out fields the draft does not mention, so they are not overwritten', async () => {
        await patch(DRAFT_ID, { details: { name: 'New name' }, location: {} })

        const row = callsTo('update')[0][0] as Record<string, unknown>
        expect(Object.entries(row).filter(([, value]) => value !== undefined)).toEqual([['name', 'New name']])
    })

    test("returns 404 when the draft doesn't exist or isn't the user's", async () => {
        query.result = { data: null, error: null }

        const response = await patch(DRAFT_ID, VALID_BODY)

        expect(response.status).toBe(404)
    })

    test('returns 404 for an id that is not a UUID, without querying', async () => {
        const response = await patch('not-a-uuid', VALID_BODY)

        expect(response.status).toBe(404)
        expect(callsTo('update')).toEqual([])
    })

    test('returns 401 when nobody is signed in', async () => {
        user = null

        const response = await patch(DRAFT_ID, VALID_BODY)

        expect(response.status).toBe(401)
    })
})

// Four corners of a plot in East Legon, in drawing order
const CORNERS = [
    { latitude: 5.635, longitude: -0.157 },
    { latitude: 5.635, longitude: -0.156 },
    { latitude: 5.636, longitude: -0.156 },
    { latitude: 5.636, longitude: -0.157 },
]

// The same plot as GeoJSON, which closes the ring and puts longitude first
const POLYGON_GEOJSON = {
    type: 'Polygon',
    coordinates: [[[-0.157, 5.635], [-0.156, 5.635], [-0.156, 5.636], [-0.157, 5.636], [-0.157, 5.635]]],
}

describe('saving the boundary', () => {
    test('saves a drawn boundary as a closed GeoJSON polygon', async () => {
        // The draft is read back after the boundary is saved, so it includes the boundary
        query.result = { data: { ...ROW, property_boundaries: { boundary_geojson: POLYGON_GEOJSON, source: 'manual_draw' } }, error: null }

        const response = await patch(DRAFT_ID, { ...VALID_BODY, boundary: { polygon: CORNERS, source: 'manual_draw' } })

        expect(response.status).toBe(200)
        expect((await response.json()).boundary).toEqual({ polygon: CORNERS, source: 'manual_draw' })
        expect(callsTo('rpc')).toEqual([['save_draft_boundary', { draft_id: DRAFT_ID, boundary: POLYGON_GEOJSON, source: 'manual_draw' }]])
    })

    test('saves a pin as a GeoJSON point', async () => {
        await patch(DRAFT_ID, { ...VALID_BODY, boundary: { pin: { latitude: 5.6037, longitude: -0.187 }, source: 'manual_draw' } })

        expect(callsTo('rpc')).toEqual([['save_draft_boundary', { draft_id: DRAFT_ID, boundary: { type: 'Point', coordinates: [-0.187, 5.6037] }, source: 'manual_draw' }]])
    })

    test('removes the boundary when it is cleared', async () => {
        await patch(DRAFT_ID, { ...VALID_BODY, boundary: null })

        expect(callsTo('rpc')).toEqual([['save_draft_boundary', { draft_id: DRAFT_ID, boundary: null, source: 'manual_draw' }]])
    })

    test('saves the boundary once a new draft exists', async () => {
        await POST(request({ ...VALID_BODY, boundary: { polygon: CORNERS, source: 'manual_draw' } }))

        expect(callsTo('rpc')).toEqual([['save_draft_boundary', { draft_id: DRAFT_ID, boundary: POLYGON_GEOJSON, source: 'manual_draw' }]])
    })

    test('records a boundary uploaded as a GeoJSON file', async () => {
        await patch(DRAFT_ID, { ...VALID_BODY, boundary: { polygon: CORNERS, source: 'geojson_import' } })

        expect(callsTo('rpc')).toEqual([['save_draft_boundary', { draft_id: DRAFT_ID, boundary: POLYGON_GEOJSON, source: 'geojson_import' }]])
    })

    test("doesn't touch boundaries when a new draft has none", async () => {
        const response = await POST(request({ ...VALID_BODY, boundary: null }))

        expect(response.status).toBe(201)
        expect(callsTo('rpc')).toEqual([])
    })

    test('removes a new draft whose boundary fails to save, so the next save does not leave a duplicate', async () => {
        query.rpcResult = { data: null, error: { message: 'function save_draft_boundary does not exist' } }

        const response = await POST(request({ ...VALID_BODY, boundary: { polygon: CORNERS, source: 'manual_draw' } }))

        expect(response.status).toBe(500)
        expect(callsTo('delete')).toEqual([[]])
        expect(callsTo('eq')).toEqual([['id', DRAFT_ID], ['status', 'draft']])
    })

    test('leaves the saved boundary alone when the draft does not mention it', async () => {
        await patch(DRAFT_ID, VALID_BODY)

        expect(callsTo('rpc')).toEqual([])
    })

    test("returns 404 when the database says the draft isn't the user's, without updating it", async () => {
        query.rpcResult = { data: null, error: { code: 'P0002', message: 'Draft not found.' } }

        const response = await patch(DRAFT_ID, { ...VALID_BODY, boundary: { polygon: CORNERS, source: 'manual_draw' } })

        expect(response.status).toBe(404)
        expect(callsTo('update')).toEqual([])
    })

    test('saves a change to only the boundary, reading the draft back instead of sending an empty update', async () => {
        const response = await patch(DRAFT_ID, { details: {}, location: {}, boundary: { polygon: CORNERS, source: 'manual_draw' } })

        expect(response.status).toBe(200)
        expect(callsTo('rpc')).toHaveLength(1)
        expect(callsTo('update')).toEqual([])
        expect(callsTo('eq')).toEqual([['id', DRAFT_ID], ['status', 'draft']])
    })

    test.each([
        ['a boundary that crosses itself', { polygon: [CORNERS[0], CORNERS[2], CORNERS[1], CORNERS[3]], source: 'manual_draw' }],
        ['a boundary with two corners', { polygon: CORNERS.slice(0, 2), source: 'manual_draw' }],
        ['both a boundary and a pin', { polygon: CORNERS, pin: CORNERS[0], source: 'manual_draw' }],
        ['a latitude off the map', { pin: { latitude: 95, longitude: 0 }, source: 'manual_draw' }],
        ['a boundary with no source', { polygon: CORNERS }],
        ['a source only reviewers set', { polygon: CORNERS, source: 'ground_survey' }],
    ])('returns 400 for %s', async (_, boundary) => {
        const response = await patch(DRAFT_ID, { ...VALID_BODY, boundary })

        expect(response.status).toBe(400)
        expect(callsTo('update')).toEqual([])
        expect(callsTo('rpc')).toEqual([])
    })

    test('returns 500 when the database rejects the boundary', async () => {
        query.rpcResult = { data: null, error: { message: "The boundary can't cross over itself." } }

        const response = await patch(DRAFT_ID, { ...VALID_BODY, boundary: { polygon: CORNERS, source: 'manual_draw' } })

        expect(response.status).toBe(500)
    })
})

describe('getDraft', () => {
    test('maps a saved row back to form fields', async () => {
        expect(await getDraft(supabase as never, DRAFT_ID)).toEqual(SAVED_DRAFT)
    })

    test('leaves out a property type or region the form no longer offers', async () => {
        query.result = { data: { ...ROW, property_type: 'house', region: 'Old Region' }, error: null }

        const draft = await getDraft(supabase as never, DRAFT_ID)

        expect(draft?.details.type).toBeUndefined()
        expect(draft?.location.region).toBeUndefined()
    })

    test('maps a saved boundary or pin back to corners', async () => {
        query.result = { data: { ...ROW, property_boundaries: { boundary_geojson: POLYGON_GEOJSON, source: 'geojson_import' } }, error: null }
        expect((await getDraft(supabase as never, DRAFT_ID))?.boundary).toEqual({ polygon: CORNERS, source: 'geojson_import' })

        const point = { type: 'Point', coordinates: [-0.187, 5.6037] }
        query.result = { data: { ...ROW, property_boundaries: { boundary_geojson: point, source: 'manual_draw' } }, error: null }
        expect((await getDraft(supabase as never, DRAFT_ID))?.boundary).toEqual({ pin: { latitude: 5.6037, longitude: -0.187 }, source: 'manual_draw' })
    })

    test('returns null for an id that is not a UUID', async () => {
        expect(await getDraft(supabase as never, 'nope')).toBeNull()
        expect(callsTo('from')).toEqual([])
    })
})

describe('saving the acquisition answer', () => {
    const DOCUMENT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
    const DOCUMENT = { id: DOCUMENT_ID, path: `${DRAFT_ID}/${DOCUMENT_ID}/deed.pdf`, file_name: 'Deed.pdf' }
    const PURCHASE = {
        method: 'purchase_from_owner',
        metadata: { transferred_by: { name: ' Kwame Mensah ', phone: '024 123 4567' }, has_document: true, document: DOCUMENT },
    }

    test('saves the method and its answers as columns', async () => {
        const response = await patch(DRAFT_ID, { ...VALID_BODY, acquisition: PURCHASE })

        expect(response.status).toBe(200)
        expect(callsTo('update')[0][0]).toMatchObject({
            acquisition_method: 'purchase_from_owner',
            acquisition_metadata: {
                transferred_by: { name: 'Kwame Mensah', phone: '024 123 4567' },
                has_document: true,
                document: DOCUMENT,
            },
        })
    })

    test('checks an uploaded document belongs to this draft', async () => {
        await patch(DRAFT_ID, { ...VALID_BODY, acquisition: PURCHASE })

        expect(callsTo('from')).toContainEqual(['property_documents'])
        expect(callsTo('eq')).toEqual(expect.arrayContaining([['id', DOCUMENT_ID], ['property_id', DRAFT_ID], ['file_path', DOCUMENT.path]]))
    })

    test("returns 400 for a document that isn't this draft's", async () => {
        query.tableResults.property_documents = { data: null, error: null }

        const response = await patch(DRAFT_ID, { ...VALID_BODY, acquisition: PURCHASE })

        expect(response.status).toBe(400)
        expect((await response.json()).error.message).toMatch(/upload it again/i)
        expect(callsTo('update')).toEqual([])
    })

    test('returns 400 for a document on a draft that is only being created', async () => {
        const response = await POST(request({ ...VALID_BODY, acquisition: PURCHASE }))

        expect(response.status).toBe(400)
        expect(callsTo('insert')).toEqual([])
    })

    test('saves a half-finished answer', async () => {
        const response = await patch(DRAFT_ID, {
            ...VALID_BODY,
            acquisition: { method: 'purchase_from_owner', metadata: { transferred_by: { phone: '024' } } },
        })

        expect(response.status).toBe(200)
    })

    test('clears the answer when it is null', async () => {
        await patch(DRAFT_ID, { ...VALID_BODY, acquisition: null })

        expect(callsTo('update')[0][0]).toMatchObject({ acquisition_method: null, acquisition_metadata: null })
    })

    test.each([
        ['an unknown method', { method: 'gift', metadata: {} }],
        ["follow-ups from another method", { method: 'unsure', metadata: { note: 'hi' } }],
        ['a document with no path', { method: 'direct_purchase', metadata: { document: { id: DOCUMENT_ID, file_name: 'a.pdf' } } }],
    ])('returns 400 for %s', async (_, acquisition) => {
        const response = await patch(DRAFT_ID, { ...VALID_BODY, acquisition })

        expect(response.status).toBe(400)
    })

    test('reads the answer back', async () => {
        query.result = { data: { ...ROW, acquisition_method: 'lease_sublease', acquisition_metadata: { lease_years: 99 } }, error: null }

        expect((await getDraft(supabase as never, DRAFT_ID))?.acquisition).toEqual({ method: 'lease_sublease', metadata: { lease_years: 99 } })
    })

    test('keeps the method when its saved answers no longer fit, so only the follow-ups are asked again', async () => {
        query.result = { data: { ...ROW, acquisition_method: 'lease_sublease', acquisition_metadata: { lease_years: 'long' } }, error: null }

        expect((await getDraft(supabase as never, DRAFT_ID))?.acquisition).toEqual({ method: 'lease_sublease', metadata: {} })
    })
})

describe('POST /api/property/draft/[id]/submit', () => {
    function submit(id = DRAFT_ID, body: unknown = { confirmed: true }) {
        const request = new Request(`http://localhost/api/property/draft/${id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }) as unknown as NextRequest
        return SUBMIT(request, { params: Promise.resolve({ id }) })
    }

    test('sends the draft for review with the declaration the user confirmed, and returns its slug', async () => {
        query.rpcResult = { data: 'east-legon-house-3f1c2b4a', error: null }

        const response = await submit()

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ slug: 'east-legon-house-3f1c2b4a' })
        expect(callsTo('rpc')).toEqual([[
            'submit_property',
            { draft_id: DRAFT_ID, declaration: 'I confirm that the information I have provided is accurate to the best of my knowledge.' },
        ]])
    })

    test.each([
        ['the declaration unticked', { confirmed: false }],
        ['no declaration', {}],
        ['wording of its own', { confirmed: true, declaration: 'Anything' }],
    ])('returns 400 for %s, without calling the database', async (_, body) => {
        const response = await submit(DRAFT_ID, body)

        expect(response.status).toBe(400)
        expect(callsTo('rpc')).toEqual([])
    })

    test("returns 404 when there is no draft the user can submit, such as one that's already submitted", async () => {
        query.rpcResult = { data: null, error: { code: 'P0002', message: 'Draft not found.' } }

        expect((await submit()).status).toBe(404)
    })

    test('returns 400 with the reason when a required answer is missing', async () => {
        const message = "Add the property's name, type, region, city and how you got it before submitting."
        query.rpcResult = { data: null, error: { code: '23514', message } }

        const response = await submit()

        expect(response.status).toBe(400)
        expect((await response.json()).error.message).toBe(message)
    })

    test('returns 404 for an id that is not a UUID, without calling the database', async () => {
        expect((await submit('nope')).status).toBe(404)
        expect(callsTo('rpc')).toEqual([])
    })

    test('returns 401 when nobody is signed in', async () => {
        user = null

        expect((await submit()).status).toBe(401)
    })

    test('returns 500 when the database fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        query.rpcResult = { data: null, error: { message: 'timeout' } }

        expect((await submit()).status).toBe(500)
    })
})
