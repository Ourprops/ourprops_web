import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { NextRequest } from 'next/server'

import { GET, POST } from '../app/api/property/draft/[id]/documents/route'
import { DELETE, PATCH } from '../app/api/property/draft/[id]/documents/[documentId]/route'

const DRAFT_ID = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const DOCUMENT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const USER_ID = '11111111-1111-4111-8111-111111111111'

// Records what each query was asked to do
const query = {
    calls: [] as { method: string; args: unknown[] }[],
    insertResult: { error: null as unknown },
    // What a delete or update returns for the one row it matched
    rowResult: { data: { file_path: `${DRAFT_ID}/${DOCUMENT_ID}/deed.pdf` } as unknown, error: null as unknown },
    listResult: { data: [] as unknown, error: null as unknown },
    removeResult: { error: null as unknown },
}
let user: { id: string } | null = { id: USER_ID }

function builder() {
    const chain: Record<string, unknown> = {}
    for (const method of ['delete', 'update', 'select', 'eq']) {
        chain[method] = (...args: unknown[]) => {
            query.calls.push({ method, args })
            return chain
        }
    }
    chain.insert = async (...args: unknown[]) => {
        query.calls.push({ method: 'insert', args })
        return query.insertResult
    }
    chain.order = async (...args: unknown[]) => {
        query.calls.push({ method: 'order', args })
        return query.listResult
    }
    chain.maybeSingle = async () => query.rowResult
    return chain
}

const supabase = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) => {
        query.calls.push({ method: 'from', args: [table] })
        return builder()
    },
    storage: {
        from: (bucket: string) => ({
            remove: async (paths: string[]) => {
                query.calls.push({ method: 'remove', args: [bucket, paths] })
                return query.removeResult
            },
        }),
    },
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => supabase,
}))

function callsTo(method: string) {
    return query.calls.filter((call) => call.method === method).map((call) => call.args)
}

function upload(body: unknown, id = DRAFT_ID) {
    const request = new Request(`http://localhost/api/property/draft/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as NextRequest
    return POST(request, { params: Promise.resolve({ id }) })
}

function list(id = DRAFT_ID) {
    const request = new Request(`http://localhost/api/property/draft/${id}/documents`) as unknown as NextRequest
    return GET(request, { params: Promise.resolve({ id }) })
}

function setType(body: unknown, documentId = DOCUMENT_ID, id = DRAFT_ID) {
    const request = new Request(`http://localhost/api/property/draft/${id}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as NextRequest
    return PATCH(request, { params: Promise.resolve({ id, documentId }) })
}

function remove(documentId = DOCUMENT_ID, id = DRAFT_ID) {
    const request = new Request(`http://localhost/api/property/draft/${id}/documents/${documentId}`, { method: 'DELETE' }) as unknown as NextRequest
    return DELETE(request, { params: Promise.resolve({ id, documentId }) })
}

const PDF = { slot: 'ownership', file_name: 'Deed of assignment.pdf', file_size_bytes: 120_000, mime_type: 'application/pdf' }

beforeEach(() => {
    query.calls = []
    query.insertResult = { error: null }
    query.rowResult = { data: { file_path: `${DRAFT_ID}/${DOCUMENT_ID}/deed.pdf` }, error: null }
    query.listResult = { data: [], error: null }
    query.removeResult = { error: null }
    user = { id: USER_ID }
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('POST /api/property/draft/[id]/documents', () => {
    test('records the document under its checklist item, unclassified, and says where to upload its file', async () => {
        const response = await upload(PDF)

        expect(response.status).toBe(201)
        const document = await response.json()
        expect(document).toEqual({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            path: `${DRAFT_ID}/${document.id}/Deed-of-assignment.pdf`,
            file_name: 'Deed of assignment.pdf',
        })
        expect(callsTo('from')).toEqual([['property_documents']])
        expect(callsTo('insert')).toEqual([[{
            id: document.id,
            property_id: DRAFT_ID,
            uploaded_by: USER_ID,
            slot: 'ownership',
            file_path: document.path,
            file_name: 'Deed of assignment.pdf',
            file_size_bytes: 120_000,
            mime_type: 'application/pdf',
        }]])
    })

    test("returns 404 when row level security refuses the draft, as it isn't the user's", async () => {
        query.insertResult = { error: { code: '42501', message: 'new row violates row-level security policy' } }

        expect((await upload(PDF)).status).toBe(404)
    })

    test('returns 404 for a draft id that is not a UUID, without querying', async () => {
        expect((await upload(PDF, 'nope')).status).toBe(404)
        expect(callsTo('insert')).toEqual([])
    })

    test.each([
        ['a text file', { ...PDF, mime_type: 'text/plain' }, /a PDF, a Word document/],
        ['a macro-enabled Word file', { ...PDF, mime_type: 'application/vnd.ms-word.document.macroEnabled.12' }, /a PDF, a Word document/],
        ['a file over 20 MB', { ...PDF, file_size_bytes: 21 * 1024 * 1024 }, /20 MB/],
        ['an empty file', { ...PDF, file_size_bytes: 0 }, /empty/],
        ['a document type, which only reviewers set', { ...PDF, document_type: 'indenture' }, /./],
        ['no checklist item', { ...PDF, slot: undefined }, /./],
        ['an unknown checklist item', { ...PDF, slot: 'photos' }, /./],
    ])('returns 400 for %s', async (_, body, message) => {
        const response = await upload(body)

        expect(response.status).toBe(400)
        expect((await response.json()).error.message).toMatch(message)
        expect(callsTo('insert')).toEqual([])
    })

    test('returns 401 when nobody is signed in', async () => {
        user = null

        expect((await upload(PDF)).status).toBe(401)
    })

    test('returns 500 when the insert fails', async () => {
        query.insertResult = { error: { code: '23505', message: 'duplicate key' } }

        expect((await upload(PDF)).status).toBe(500)
    })
})

// A row as Postgres returns it
const ROW = {
    id: DOCUMENT_ID,
    file_path: `${DRAFT_ID}/${DOCUMENT_ID}/deed.pdf`,
    file_name: 'Deed.pdf',
    slot: 'site_plan',
    declared_type: null,
    file_size_bytes: 120_000,
    mime_type: 'application/pdf',
    created_at: '2026-10-15T09:00:00+00:00',
}

const LISTED = {
    id: DOCUMENT_ID,
    path: ROW.file_path,
    file_name: 'Deed.pdf',
    slot: 'site_plan',
    declared_type: null,
    file_size_bytes: 120_000,
    mime_type: 'application/pdf',
    created_at: ROW.created_at,
}

describe('GET /api/property/draft/[id]/documents', () => {
    test("lists the draft's documents, oldest first", async () => {
        query.listResult = { data: [ROW, { ...ROW, declared_type: 'cadastral_plan' }], error: null }

        const response = await list()

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual([LISTED, { ...LISTED, declared_type: 'cadastral_plan' }])
        expect(callsTo('eq')).toEqual([['property_id', DRAFT_ID]])
        expect(callsTo('order')).toEqual([['created_at', { ascending: true }]])
    })

    test('shows a value it no longer knows as supporting and unclassified, rather than dropping the document', async () => {
        query.listResult = { data: [{ ...ROW, slot: 'old', declared_type: 'old' }], error: null }

        expect(await (await list()).json()).toEqual([{ ...LISTED, slot: 'supporting', declared_type: null }])
    })

    test('returns 404 for a draft id that is not a UUID, without querying', async () => {
        expect((await list('nope')).status).toBe(404)
        expect(callsTo('from')).toEqual([])
    })

    test('returns 401 when nobody is signed in', async () => {
        user = null

        expect((await list()).status).toBe(401)
    })

    test('returns 500 when the query fails', async () => {
        query.listResult = { data: null, error: { message: 'timeout' } }

        expect((await list()).status).toBe(500)
    })
})

describe('PATCH /api/property/draft/[id]/documents/[documentId]', () => {
    test('records what the user says the document is', async () => {
        query.rowResult = { data: { ...ROW, declared_type: 'site_plan' }, error: null }

        const response = await setType({ declared_type: 'site_plan' })

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ ...LISTED, declared_type: 'site_plan' })
        expect(callsTo('update')).toEqual([[{ declared_type: 'site_plan' }]])
        expect(callsTo('eq')).toEqual([['id', DOCUMENT_ID], ['property_id', DRAFT_ID]])
    })

    test("clears the answer when the user isn't sure", async () => {
        query.rowResult = { data: ROW, error: null }

        expect((await setType({ declared_type: null })).status).toBe(200)
        expect(callsTo('update')).toEqual([[{ declared_type: null }]])
    })

    test.each([
        ['an unknown type', { declared_type: 'title' }],
        ["'other', which only reviewers choose", { declared_type: 'other' }],
        ['the final type, which only reviewers set', { declared_type: null, document_type: 'indenture' }],
        ['a different checklist item', { declared_type: null, slot: 'ownership' }],
    ])('returns 400 for %s', async (_, body) => {
        expect((await setType(body)).status).toBe(400)
        expect(callsTo('update')).toEqual([])
    })

    test("returns 404 when there is no such document the user can change, such as one that's been reviewed", async () => {
        query.rowResult = { data: null, error: null }

        expect((await setType({ declared_type: 'indenture' })).status).toBe(404)
    })

    test('returns 404 for ids that are not UUIDs, without querying', async () => {
        expect((await setType({ declared_type: 'indenture' }, 'nope')).status).toBe(404)
        expect(callsTo('from')).toEqual([])
    })

    test('returns 401 when nobody is signed in', async () => {
        user = null

        expect((await setType({ declared_type: 'indenture' })).status).toBe(401)
    })
})

describe('DELETE /api/property/draft/[id]/documents/[documentId]', () => {
    test('removes the record, then its file', async () => {
        const response = await remove()

        expect(response.status).toBe(204)
        expect(callsTo('eq')).toEqual([['id', DOCUMENT_ID], ['property_id', DRAFT_ID]])
        expect(callsTo('remove')).toEqual([['property-documents', [`${DRAFT_ID}/${DOCUMENT_ID}/deed.pdf`]]])
        expect(query.calls.findIndex((call) => call.method === 'delete')).toBeLessThan(query.calls.findIndex((call) => call.method === 'remove'))
    })

    test("returns 404 when there is no such document the user can remove, and leaves files alone", async () => {
        query.rowResult = { data: null, error: null }

        expect((await remove()).status).toBe(404)
        expect(callsTo('remove')).toEqual([])
    })

    test('still succeeds when the file was already gone', async () => {
        query.removeResult = { error: { message: 'Object not found' } }

        expect((await remove()).status).toBe(204)
    })

    test('returns 404 for ids that are not UUIDs, without querying', async () => {
        expect((await remove('nope')).status).toBe(404)
        expect(callsTo('from')).toEqual([])
    })

    test('returns 401 when nobody is signed in', async () => {
        user = null

        expect((await remove()).status).toBe(401)
    })
})
