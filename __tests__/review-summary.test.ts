import { describe, expect, test } from 'vitest'

import { blockerAnchor, reviewProgress } from '../lib/admin/review-summary'

describe('blockerAnchor', () => {
    // Every sentence approval_blockers can return (supabase/migrations/20261103120000_document_requests.sql)
    test.each([
        ["Owner's identity isn't verified.", 'owner'],
        ["Ownership claim isn't verified.", 'checkpoint-ownership_claim_verified'],
        ["Boundary mapped isn't verified or waived.", 'checkpoint-boundary_mapped'],
        ["Cadastral cross-check isn't verified or waived.", 'checkpoint-cadastral_cross_check'],
        ["No overlaps isn't verified or waived.", 'checkpoint-overlap_clearance'],
        ["Lands Commission search isn't verified or waived.", 'checkpoint-official_search_status'],
        ["Court cases and encumbrances isn't verified or waived.", 'checkpoint-encumbrance_clearance'],
        ["The ownership type and structure aren't classified.", 'answers'],
        ['1 document still needs reviewing.', 'documents'],
        ['3 documents still need reviewing.', 'documents'],
        ['An overlap with another property is still open.', 'overlaps'],
        ["A document asked for from the owner hasn't arrived.", 'documents'],
    ])('links "%s" to #%s', (blocker, anchor) => {
        expect(blockerAnchor(blocker)).toBe(anchor)
    })

    test('links nothing it doesn\'t recognise, rather than guessing', () => {
        expect(blockerAnchor('Something new the database says.')).toBeNull()
    })
})

describe('reviewProgress', () => {
    const checkpoint = (status: string) => ({ checkpoint_key: 'x', status }) as never
    const document = (verification_status: string) => ({ verification_status }) as never
    const overlap = (status: string) => ({ status }) as never

    test('counts verified and waived checkpoints as done, out of all seven', () => {
        const progress = reviewProgress({
            checkpoints: ['verified', 'waived', 'flagged', 'in_progress', 'unverified'].map(checkpoint),
            documents: [],
            overlaps: [],
        })
        expect(progress).toMatchObject({ checkpointsDone: 2, checkpointsTotal: 7 })
    })

    test('counts the documents still waiting, and the overlaps still open', () => {
        const progress = reviewProgress({
            checkpoints: [],
            documents: ['unreviewed', 'accepted', 'unreviewed', 'rejected'].map(document),
            overlaps: ['detected', 'investigating', 'resolved_valid', 'resolved_false_positive'].map(overlap),
        })
        expect(progress).toMatchObject({ documentsToReview: 2, openOverlaps: 2 })
    })
})
