import { describe, expect, test } from 'vitest'

import { daysWaiting, filterQueue, queueCounts } from '../lib/admin/queue-view'
import type { QueueItem } from '../lib/admin/review'

function item(id: string, status: string, fields: Partial<QueueItem> = {}): QueueItem {
    return {
        id,
        propId: `PROP-${id}`,
        name: `Plot ${id}`,
        status,
        place: 'Oyarifa, Greater Accra',
        ownerName: 'Ama Mensah',
        submittedAt: null,
        reviewerName: null,
        hasBoundary: true,
        documentCount: 2,
        openOverlaps: 0,
        ...fields,
    }
}

const QUEUE = [
    item('a', 'submitted'),
    item('b', 'under_review', { openOverlaps: 1 }),
    item('c', 'under_review'),
    item('d', 'action_required', { openOverlaps: 2 }),
]

describe('review queue groups', () => {
    test('filters by where each property is, and by open overlaps', () => {
        expect(filterQueue(QUEUE, 'to_start').map((each) => each.id)).toEqual(['a'])
        expect(filterQueue(QUEUE, 'in_review').map((each) => each.id)).toEqual(['b', 'c'])
        expect(filterQueue(QUEUE, 'waiting').map((each) => each.id)).toEqual(['d'])
        expect(filterQueue(QUEUE, 'overlaps').map((each) => each.id)).toEqual(['b', 'd'])
        expect(filterQueue(QUEUE, 'all')).toHaveLength(4)
    })

    test('counts each group for the tiles and tabs', () => {
        expect(queueCounts(QUEUE)).toEqual({ all: 4, to_start: 1, in_review: 2, waiting: 1, overlaps: 2 })
    })
})

describe('daysWaiting', () => {
    const now = Date.parse('2026-11-10T12:00:00Z')

    test('counts whole days since submission', () => {
        expect(daysWaiting('2026-11-10T08:00:00Z', now)).toBe(0)
        expect(daysWaiting('2026-11-09T11:00:00Z', now)).toBe(1)
        expect(daysWaiting('2026-11-01T12:00:00Z', now)).toBe(9)
    })

    test('has nothing to say without a submission date', () => {
        expect(daysWaiting(null, now)).toBeNull()
    })
})
