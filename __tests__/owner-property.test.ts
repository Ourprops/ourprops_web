import { beforeEach, describe, expect, test, vi } from 'vitest'

import { resubmitProperty } from '../app/account/dashboard/properties/[id]/actions'
import { requestedUploads } from '../lib/supabase/owner-properties'

const PROPERTY = 'aaaaaaaa-0000-4000-8000-000000000001'

const rpc = vi.fn()
const getClaims = vi.fn()
const refresh = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getClaims }, rpc }) }))
vi.mock('next/cache', () => ({ refresh: () => refresh() }))
vi.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`NEXT_REDIRECT ${path}`)
    },
}))

describe('requestedUploads', () => {
    const request = { slot: 'site_plan', created_at: '2026-11-03T10:00:00Z' }

    test('lists documents uploaded into a requested item since it was asked for', () => {
        const uploads = requestedUploads(
            [request],
            [
                { id: 'old', slot: 'site_plan', file_name: 'blurry.pdf', created_at: '2026-11-01T09:00:00Z' },
                { id: 'new', slot: 'site_plan', file_name: 'clear.pdf', created_at: '2026-11-03T10:05:00Z' },
                { id: 'other', slot: 'ownership', file_name: 'deed.pdf', created_at: '2026-11-03T10:05:00Z' },
            ]
        )
        expect(uploads.map((upload) => upload.id)).toEqual(['new'])
    })

    test('compares times, not text, so timestamps written with different precision still order correctly', () => {
        // As text, "10:00:00Z" sorts after "10:00:00.5+00:00", though it is half a second earlier
        const uploads = requestedUploads(
            [{ slot: 'site_plan', created_at: '2026-11-03T10:00:00.5+00:00' }],
            [{ id: 'same-second', slot: 'site_plan', file_name: 'a.pdf', created_at: '2026-11-03T10:00:00Z' }]
        )
        expect(uploads).toEqual([])
    })

    test('lists nothing when nothing is asked for', () => {
        expect(
            requestedUploads([], [{ id: 'new', slot: 'site_plan', file_name: 'clear.pdf', created_at: '2026-11-03T10:05:00Z' }])
        ).toEqual([])
    })
})

describe('resubmitProperty', () => {
    beforeEach(() => {
        rpc.mockReset().mockResolvedValue({ data: null, error: null })
        getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'owner' } } })
        refresh.mockReset()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    test('sends someone who is signed out to sign in, without touching the database', async () => {
        getClaims.mockResolvedValue({ data: null })

        await expect(resubmitProperty(PROPERTY, null)).rejects.toThrow('NEXT_REDIRECT /account/login')
        expect(rpc).not.toHaveBeenCalled()
    })

    test('refuses an id that is not a uuid without calling the database', async () => {
        expect(await resubmitProperty('nope', null)).toEqual({ error: 'Property not found.' })
        expect(rpc).not.toHaveBeenCalled()
    })

    test('sends the property back and refreshes the page', async () => {
        expect(await resubmitProperty(PROPERTY, null)).toBeNull()
        expect(rpc).toHaveBeenCalledWith('resubmit_property', { property_id: PROPERTY })
        expect(refresh).toHaveBeenCalledOnce()
    })

    test("shows the database's reason when something is still missing", async () => {
        rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'Upload the document we asked for first.' } })

        expect(await resubmitProperty(PROPERTY, null)).toEqual({ error: 'Upload the document we asked for first.' })
        expect(refresh).not.toHaveBeenCalled()
    })
})
