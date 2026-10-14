import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { NextRequest } from 'next/server'

import { POST } from '../app/api/property/draft/[id]/documents/route'
import { DELETE } from '../app/api/property/draft/[id]/documents/[documentId]/route'

const DRAFT_ID = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const DOCUMENT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const USER_ID = '11111111-1111-4111-8111-111111111111'

// Records what each query was asked to do
const query = {
    calls: [] as { method: string; args: unknown[] }[],
    insertResult: { error: null as unknown },
    deleteResult: { data: { file_path: `${DRAFT_ID}/${DOCUMENT_ID}/deed.pdf` } as unknown, error: null as unknown },
    removeResult: { error: null as unknown },
}
let user: { id: string } | null = { id: USER_ID }

function builder() {
    const chain: Record<string, unknown> = {}
    for (const method of ['delete', 'select', 'eq']) {
        chain[method] = (...args: unknown[]) => {
            query.calls.push({ method, args })
            return chain
        }
    }
    chain.insert = async (...args: unknown[]) => {
        query.calls.push({ method: 'insert', args })
        return query.insertResult
    }
    chain.maybeSingle = async () => query.deleteResult
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

function remove(documentId = DOCUMENT_ID, id = DRAFT_ID) {
    const request = new Request(`http://localhost/api/property/draft/${id}/documents/${documentId}`, { method: 'DELETE' }) as unknown as NextRequest
    return DELETE(request, { params: Promise.resolve({ id, documentId }) })
}

const PDF = { file_name: 'Deed of assignment.pdf', file_size_bytes: 120_000, mime_type: 'application/pdf' }

beforeEach(() => {
    query.calls = []
    query.insertResult = { error: null }
    query.deleteResult = { data: { file_path: `${DRAFT_ID}/${DOCUMENT_ID}/deed.pdf` }, error: null }
    query.removeResult = { error: null }
    user = { id: USER_ID }
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('POST /api/property/draft/[id]/documents', () => {
    test('records an unclassified document and says where to upload its file', async () => {
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
            document_type: 'other',
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

describe('DELETE /api/property/draft/[id]/documents/[documentId]', () => {
    test('removes the record, then its file', async () => {
        const response = await remove()

        expect(response.status).toBe(204)
        expect(callsTo('eq')).toEqual([['id', DOCUMENT_ID], ['property_id', DRAFT_ID]])
        expect(callsTo('remove')).toEqual([['property-documents', [`${DRAFT_ID}/${DOCUMENT_ID}/deed.pdf`]]])
        expect(query.calls.findIndex((call) => call.method === 'delete')).toBeLessThan(query.calls.findIndex((call) => call.method === 'remove'))
    })

    test("returns 404 when there is no such document the user can remove, and leaves files alone", async () => {
        query.deleteResult = { data: null, error: null }

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
