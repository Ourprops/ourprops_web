import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { NextRequest } from 'next/server'

import { POST } from '../app/api/property/draft/route'
import { PATCH } from '../app/api/property/draft/[id]/route'
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
    updated_at: '2026-10-13T12:00:00.000000+00:00',
}

// Records what each query was asked to do and resolves with `result`
const query = {
    calls: [] as { method: string; args: unknown[] }[],
    result: { data: ROW as unknown, error: null as unknown },
}
let user: { id: string } | null = { id: USER_ID }

function builder() {
    const chain: Record<string, unknown> = {}
    for (const method of ['insert', 'update', 'select', 'eq']) {
        chain[method] = (...args: unknown[]) => {
            query.calls.push({ method, args })
            return chain
        }
    }
    chain.single = async () => query.result
    chain.maybeSingle = async () => query.result
    return chain
}

const supabase = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) => {
        query.calls.push({ method: 'from', args: [table] })
        return builder()
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
}

beforeEach(() => {
    query.calls = []
    query.result = { data: ROW, error: null }
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

    test('returns null for an id that is not a UUID', async () => {
        expect(await getDraft(supabase as never, 'nope')).toBeNull()
        expect(callsTo('from')).toEqual([])
    })
})
