import { beforeEach, describe, expect, test, vi } from 'vitest'

import { startReview } from '../app/admin/properties/[id]/actions'
import { actionErrorMessage, GENERIC_ACTION_ERROR } from '../lib/admin/errors'

const PROPERTY = 'aaaaaaaa-0000-4000-8000-000000000001'

const rpc = vi.fn()
const requireAdmin = vi.fn()
const refresh = vi.fn()

vi.mock('@/lib/auth/staff', () => ({ requireAdmin: () => requireAdmin() }))
vi.mock('next/cache', () => ({ refresh: () => refresh() }))

describe('startReview', () => {
    beforeEach(() => {
        rpc.mockReset().mockResolvedValue({ data: null, error: null })
        requireAdmin.mockReset().mockResolvedValue({ supabase: { rpc }, adminId: 'admin' })
        refresh.mockReset()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    test('checks the caller before touching the database', async () => {
        // notFound() and redirect() work by throwing, so a caller who isn't an admin never gets past requireAdmin()
        requireAdmin.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'))

        await expect(startReview(PROPERTY, null)).rejects.toThrow()
        expect(rpc).not.toHaveBeenCalled()
    })

    test('refuses an id that is not a uuid without calling the database', async () => {
        expect(await startReview('not-a-uuid', null)).toEqual({ error: 'Property not found.' })
        expect(rpc).not.toHaveBeenCalled()
    })

    test('starts the review and refreshes the page', async () => {
        expect(await startReview(PROPERTY, null)).toBeNull()
        expect(rpc).toHaveBeenCalledWith('start_review', { property_id: PROPERTY })
        expect(refresh).toHaveBeenCalledOnce()
    })

    test("shows the database's message when it refuses, and doesn't refresh", async () => {
        rpc.mockResolvedValue({
            data: null,
            error: { code: '23514', message: 'Only a submitted property can be taken into review.' },
        })

        expect(await startReview(PROPERTY, null)).toEqual({ error: 'Only a submitted property can be taken into review.' })
        expect(refresh).not.toHaveBeenCalled()
    })

    test('hides an unexpected database error behind a generic message', async () => {
        rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection to 10.0.0.5 failed' } })

        expect(await startReview(PROPERTY, null)).toEqual({ error: GENERIC_ACTION_ERROR })
    })
})

describe('actionErrorMessage', () => {
    test('shows the messages review functions raise on purpose', () => {
        expect(actionErrorMessage({ code: 'P0002', message: 'Property not found.' })).toBe('Property not found.')
        expect(actionErrorMessage({ code: '23514', message: 'Add a public note saying why.' })).toBe('Add a public note saying why.')
    })

    test('hides permission errors and errors without a code', () => {
        expect(actionErrorMessage({ code: '42501', message: 'Only admins can review properties.' })).toBe(GENERIC_ACTION_ERROR)
        expect(actionErrorMessage({ message: 'fetch failed' })).toBe(GENERIC_ACTION_ERROR)
    })
})
