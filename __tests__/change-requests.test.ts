import { describe, expect, test } from 'vitest'

import { changeRequestChecklist } from '../lib/change-requests'

const ASKED = '2026-11-06T11:00:00Z'
const request = { id: 'r1', slot: 'site_plan', note: 'A clearer plan', created_at: ASKED }

describe('changeRequestChecklist', () => {
    test('a requested document is done once one is uploaded in its item since it was asked for', () => {
        const before = changeRequestChecklist({
            openRequests: [request],
            documents: [{ slot: 'site_plan', created_at: '2026-11-01T00:00:00Z' }],
            identityRequested: false,
            identityStatus: null,
        })
        expect(before.complete).toBe(false)

        const after = changeRequestChecklist({
            openRequests: [request],
            documents: [{ slot: 'site_plan', created_at: '2026-11-07T00:00:00Z' }],
            identityRequested: false,
            identityStatus: null,
        })
        expect(after.complete).toBe(true)
    })

    test("an upload in another item doesn't answer the request", () => {
        const checklist = changeRequestChecklist({
            openRequests: [request],
            documents: [{ slot: 'ownership', created_at: '2026-11-07T00:00:00Z' }],
            identityRequested: false,
            identityStatus: null,
        })
        expect(checklist.items[0].done).toBe(false)
    })

    test.each([
        [null, false],
        ['rejected', false],
        ['unreviewed', true],
        ['verified', true],
    ] as const)('an identity document that is %s counts as done: %s', (identityStatus, done) => {
        const checklist = changeRequestChecklist({ openRequests: [], documents: [], identityRequested: true, identityStatus })
        expect(checklist.items).toEqual([{ kind: 'identity', status: identityStatus, done }])
        expect(checklist.complete).toBe(done)
    })

    // The case found clicking through: identity asked for alone, then sent and verified
    test("is complete once identity was the only thing asked for and it's verified, leaving only the owner's send", () => {
        const checklist = changeRequestChecklist({ openRequests: [], documents: [], identityRequested: true, identityStatus: 'verified' })
        expect(checklist.complete).toBe(true)
    })

    test("doesn't list identity when it wasn't asked for", () => {
        const checklist = changeRequestChecklist({ openRequests: [], documents: [], identityRequested: false, identityStatus: null })
        expect(checklist).toEqual({ items: [], complete: true })
    })
})
