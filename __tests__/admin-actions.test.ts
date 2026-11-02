import { beforeEach, describe, expect, test, vi } from 'vitest'

import { startReview, updateCheckpoint } from '../app/admin/properties/[id]/actions'
import { actionErrorMessage, GENERIC_ACTION_ERROR } from '../lib/admin/errors'
import { MAX_CHECKPOINT_NOTE_LENGTH } from '../lib/validators/admin'

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

function checkpointForm(fields: Record<string, string>) {
    const formData = new FormData()
    for (const [name, value] of Object.entries(fields)) formData.set(name, value)
    return formData
}

describe('updateCheckpoint', () => {
    const verified = { status: 'verified', public_note: 'Matches the indenture.', internal_note: '' }

    beforeEach(() => {
        rpc.mockReset().mockResolvedValue({ data: null, error: null })
        requireAdmin.mockReset().mockResolvedValue({ supabase: { rpc }, adminId: 'admin' })
        refresh.mockReset()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    test('checks the caller before reading the form or touching the database', async () => {
        requireAdmin.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'))

        await expect(updateCheckpoint(PROPERTY, 'boundary_mapped', null, checkpointForm(verified))).rejects.toThrow()
        expect(rpc).not.toHaveBeenCalled()
    })

    test('sends the update to update_checkpoint and refreshes the page', async () => {
        expect(await updateCheckpoint(PROPERTY, 'boundary_mapped', null, checkpointForm(verified))).toBeNull()
        expect(rpc).toHaveBeenCalledWith('update_checkpoint', {
            property_id: PROPERTY,
            checkpoint_key: 'boundary_mapped',
            status: 'verified',
            public_note: 'Matches the indenture.',
            internal_note: '',
        })
        expect(refresh).toHaveBeenCalledOnce()
    })

    test('treats missing note fields as empty, which clears them', async () => {
        await updateCheckpoint(PROPERTY, 'boundary_mapped', null, checkpointForm({ status: 'in_progress' }))
        expect(rpc).toHaveBeenCalledWith('update_checkpoint', expect.objectContaining({ public_note: '', internal_note: '' }))
    })

    test.each([
        ['a property id that is not a uuid', 'not-a-uuid', 'boundary_mapped', verified, 'Checkpoint not found.'],
        ['a checkpoint that is not one of the seven', PROPERTY, 'made_up', verified, 'Checkpoint not found.'],
        ['no status', PROPERTY, 'boundary_mapped', { public_note: '' }, 'Choose a status'],
        ["'submitted', which only owners' evidence sets", PROPERTY, 'boundary_mapped', { status: 'submitted' }, 'Choose a status'],
        [
            'a note over the limit',
            PROPERTY,
            'boundary_mapped',
            { status: 'verified', public_note: 'x'.repeat(MAX_CHECKPOINT_NOTE_LENGTH + 1) },
            'Keep notes to 2,000 characters or fewer',
        ],
    ])('refuses %s without calling the database', async (_case, propertyId, checkpointKey, fields, message) => {
        expect(await updateCheckpoint(propertyId, checkpointKey, null, checkpointForm(fields))).toEqual({ error: message })
        expect(rpc).not.toHaveBeenCalled()
    })

    test("leaves the review rules to the database and shows its message", async () => {
        // Flagged without a public note gets through the shape check; update_checkpoint is what refuses it
        rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'Add a public note saying why.' } })

        expect(
            await updateCheckpoint(PROPERTY, 'boundary_mapped', null, checkpointForm({ status: 'flagged', public_note: '' }))
        ).toEqual({ error: 'Add a public note saying why.' })
        expect(rpc).toHaveBeenCalledOnce()
        expect(refresh).not.toHaveBeenCalled()
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
