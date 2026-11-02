import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
    approveProperty,
    classifyProperty,
    recordEncumbrance,
    reopenReview,
    requestChanges,
    resolveOverlap,
    reviewDocument,
    startReview,
    suspendProperty,
    updateCheckpoint,
    updateEncumbrance,
} from '../app/admin/properties/[id]/actions'
import { actionErrorMessage, GENERIC_ACTION_ERROR } from '../lib/action-errors'
import { MAX_NOTE_LENGTH } from '../lib/validators/admin'

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
            { status: 'verified', public_note: 'x'.repeat(MAX_NOTE_LENGTH + 1) },
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

// Builds what a form posts; an array is one field sent several times, as checkboxes are
function form(fields: Record<string, string | string[]>) {
    const formData = new FormData()
    for (const [name, value] of Object.entries(fields)) {
        for (const item of [value].flat()) formData.append(name, item)
    }
    return formData
}

const DOCUMENT = 'dddddddd-0000-4000-8000-000000000001'
const FLAG = 'ffffffff-0000-4000-8000-000000000001'
const ENCUMBRANCE = 'eeeeeeee-0000-4000-8000-000000000001'

// Each action with a form that should go through, and exactly what it should send to its database function
const ACTIONS = [
    {
        name: 'classifyProperty',
        call: () => classifyProperty(PROPERTY, null, form({ ownership_type: 'state_lease', ownership_structure: 'sole' })),
        fn: 'classify_property',
        args: { property_id: PROPERTY, ownership_type: 'state_lease', ownership_structure: 'sole' },
    },
    {
        name: 'reviewDocument',
        call: () => reviewDocument(DOCUMENT, null, form({ document_type: 'indenture', status: 'accepted', note: '' })),
        fn: 'review_document',
        args: { document_id: DOCUMENT, document_type: 'indenture', verification_status: 'accepted', note: '' },
    },
    {
        name: 'resolveOverlap',
        call: () => resolveOverlap(FLAG, null, form({ status: 'resolved_false_positive', note: 'The plots only touch' })),
        fn: 'resolve_overlap',
        args: { flag_id: FLAG, status: 'resolved_false_positive', note: 'The plots only touch' },
    },
    {
        name: 'approveProperty',
        call: () => approveProperty(PROPERTY, null),
        fn: 'approve_property',
        args: { property_id: PROPERTY },
    },
    {
        name: 'suspendProperty',
        call: () => suspendProperty(PROPERTY, null, form({ reason: 'Verification expired' })),
        fn: 'suspend_property',
        args: { property_id: PROPERTY, reason: 'Verification expired' },
    },
    {
        name: 'reopenReview',
        call: () =>
            reopenReview(PROPERTY, null, form({ note: 'Neighbour disputes it', checkpoints: ['boundary_mapped', 'overlap_clearance'] })),
        fn: 'reopen_review',
        args: { property_id: PROPERTY, note: 'Neighbour disputes it', checkpoints: ['boundary_mapped', 'overlap_clearance'] },
    },
    {
        name: 'requestChanges',
        call: () =>
            requestChanges(
                PROPERTY,
                null,
                form({
                    message: ' We need a clearer site plan. ',
                    slots: ['site_plan'],
                    note_site_plan: 'Too blurry to read',
                    note_ownership: 'Left over from a box that was unticked',
                })
            ),
        fn: 'request_changes',
        args: {
            property_id: PROPERTY,
            message: 'We need a clearer site plan.',
            documents: [{ slot: 'site_plan', note: 'Too blurry to read' }],
            identity: false,
        },
    },
    {
        name: 'recordEncumbrance',
        call: () =>
            recordEncumbrance(
                PROPERTY,
                null,
                form({ kind: 'litigation', reference: '  SUIT NO. LD/0456/2026 ', blocks_activation: 'yes', note: '' })
            ),
        fn: 'record_encumbrance',
        args: { property_id: PROPERTY, kind: 'litigation', reference: 'SUIT NO. LD/0456/2026', blocks_activation: true, note: '' },
    },
    {
        name: 'updateEncumbrance',
        call: () => updateEncumbrance(ENCUMBRANCE, null, form({ blocks_activation: 'no', status: 'resolved', note: 'Case struck out' })),
        fn: 'update_encumbrance',
        args: { encumbrance_id: ENCUMBRANCE, blocks_activation: false, status: 'resolved', note: 'Case struck out' },
    },
]

describe('the other review actions', () => {
    beforeEach(() => {
        rpc.mockReset().mockResolvedValue({ data: null, error: null })
        requireAdmin.mockReset().mockResolvedValue({ supabase: { rpc }, adminId: 'admin' })
        refresh.mockReset()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    test.each(ACTIONS)('$name checks the caller before touching the database', async ({ call }) => {
        requireAdmin.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'))

        await expect(call()).rejects.toThrow()
        expect(rpc).not.toHaveBeenCalled()
    })

    test.each(ACTIONS)('$name sends exactly its fields to $fn and refreshes the page', async ({ call, fn, args }) => {
        expect(await call()).toBeNull()
        expect(rpc).toHaveBeenCalledWith(fn, args)
        expect(refresh).toHaveBeenCalledOnce()
    })

    test.each(ACTIONS)("$name shows the database's refusal and doesn't refresh", async ({ call }) => {
        rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'This property can\'t be approved yet.' } })

        expect(await call()).toEqual({ error: 'This property can\'t be approved yet.' })
        expect(refresh).not.toHaveBeenCalled()
    })

    test.each([
        ['classifyProperty with an unknown type', () => classifyProperty(PROPERTY, null, form({ ownership_type: 'freehold', ownership_structure: 'sole' })), 'Choose an ownership type'],
        ['classifyProperty with a bad property id', () => classifyProperty('nope', null, form({ ownership_type: 'state_lease', ownership_structure: 'sole' })), 'Property not found.'],
        ['reviewDocument sending a document back to unreviewed', () => reviewDocument(DOCUMENT, null, form({ document_type: '', status: 'unreviewed' })), 'Choose accepted, rejected or superseded'],
        ['reviewDocument with a bad document id', () => reviewDocument('nope', null, form({ status: 'accepted' })), 'Document not found.'],
        ['resolveOverlap back to detected', () => resolveOverlap(FLAG, null, form({ status: 'detected' })), 'Choose what you found'],
        ['approveProperty with a bad property id', () => approveProperty('nope', null), 'Property not found.'],
        ['suspendProperty with a reason over the limit', () => suspendProperty(PROPERTY, null, form({ reason: 'x'.repeat(MAX_NOTE_LENGTH + 1) })), 'Keep notes to 2,000 characters or fewer'],
        ['reopenReview with a made-up checkpoint', () => reopenReview(PROPERTY, null, form({ note: 'Why', checkpoints: ['made_up'] })), 'Choose checkpoints from the list'],
        ['recordEncumbrance without saying whether it blocks', () => recordEncumbrance(PROPERTY, null, form({ kind: 'mortgage', reference: 'LC/1' })), 'Say whether it blocks activation'],
        ['recordEncumbrance with a blank reference', () => recordEncumbrance(PROPERTY, null, form({ kind: 'mortgage', reference: '   ', blocks_activation: 'no' })), 'Enter the suit number or registry reference'],
        ['requestChanges with nothing ticked', () => requestChanges(PROPERTY, null, form({ message: 'Please send' })), 'Ask for at least one document'],
        ['requestChanges without a message', () => requestChanges(PROPERTY, null, form({ message: '  ', slots: ['site_plan'], note_site_plan: 'Clearer' })), 'Write the message the owner will see'],
        ['requestChanges with a ticked item but no note', () => requestChanges(PROPERTY, null, form({ message: 'Please send', slots: ['site_plan'] })), 'Say what to send for each item you ask for'],
        ['requestChanges for an item that isn\'t on the checklist', () => requestChanges(PROPERTY, null, form({ message: 'Please send', slots: ['photos'], note_photos: 'x' })), 'Choose checklist items from the list'],
        ['updateEncumbrance with an unknown status', () => updateEncumbrance(ENCUMBRANCE, null, form({ blocks_activation: 'no', status: 'closed' })), 'Choose open or resolved'],
    ])('refuses %s without calling the database', async (_case, call, message) => {
        expect(await call()).toEqual({ error: message })
        expect(rpc).not.toHaveBeenCalled()
    })

    test('reviewDocument sends an empty type as null, which keeps the type already set', async () => {
        await reviewDocument(DOCUMENT, null, form({ document_type: '', status: 'rejected', note: 'Too blurry' }))
        expect(rpc).toHaveBeenCalledWith('review_document', expect.objectContaining({ document_type: null }))
    })

    test('reopenReview leaves "choose at least one" to the database, which says it in its own words', async () => {
        await reopenReview(PROPERTY, null, form({ note: 'Why' }))
        expect(rpc).toHaveBeenCalledWith('reopen_review', expect.objectContaining({ checkpoints: [] }))
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
