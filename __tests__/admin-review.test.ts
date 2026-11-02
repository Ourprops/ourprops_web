import { describe, expect, test } from 'vitest'

import { buildQueue, getPropertyForReview } from '../lib/admin/review'

const A = 'aaaaaaaa-0000-4000-8000-000000000001'
const B = 'aaaaaaaa-0000-4000-8000-000000000002'
const C = 'aaaaaaaa-0000-4000-8000-000000000003'

function property(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        prop_id: `PROP-${id.slice(-1)}`,
        name: `Plot ${id.slice(-1)}`,
        status: 'submitted',
        region: 'Greater Accra',
        city_town: 'Oyarifa',
        owner: { full_name: 'Ama Mensah' },
        property_boundaries: { id: 'boundary' },
        property_documents: [{ count: 2 }],
        ...overrides,
    }
}

describe('buildQueue', () => {
    test('lists the oldest submission first', () => {
        const queue = buildQueue(
            [property(A), property(B)],
            [
                { property_id: B, action: 'property_submitted', created_at: '2026-10-01T10:00:00Z', actor: null },
                { property_id: A, action: 'property_submitted', created_at: '2026-10-05T10:00:00Z', actor: null },
            ],
            []
        )
        expect(queue.map((item) => item.id)).toEqual([B, A])
    })

    test('puts a property with no submission date last instead of first', () => {
        const queue = buildQueue(
            [property(A), property(B)],
            [{ property_id: B, action: 'property_submitted', created_at: '2026-10-05T10:00:00Z', actor: null }],
            []
        )
        expect(queue.map((item) => item.id)).toEqual([B, A])
        expect(queue[1].submittedAt).toBeNull()
    })

    test('shows the admin who last started the review as the reviewer', () => {
        const queue = buildQueue(
            [property(A, { status: 'under_review' })],
            [
                { property_id: A, action: 'property_submitted', created_at: '2026-10-01T10:00:00Z', actor: { full_name: 'Ama Mensah' } },
                { property_id: A, action: 'property_review_started', created_at: '2026-10-02T10:00:00Z', actor: { full_name: 'Kofi Boateng' } },
                { property_id: A, action: 'property_review_started', created_at: '2026-10-09T10:00:00Z', actor: { full_name: 'Esi Owusu' } },
            ],
            []
        )
        expect(queue[0].reviewerName).toBe('Esi Owusu')
        // the owner's own submission doesn't make them the reviewer
        expect(queue[0].submittedAt).toBe('2026-10-01T10:00:00Z')
    })

    test('counts open overlaps on whichever side of the flag a property is', () => {
        const queue = buildQueue(
            [property(A), property(B), property(C)],
            [],
            [
                { property_id: A, conflicting_property_id: B },
                { property_id: C, conflicting_property_id: A },
            ]
        )
        const overlaps = Object.fromEntries(queue.map((item) => [item.id, item.openOverlaps]))
        expect(overlaps).toEqual({ [A]: 2, [B]: 1, [C]: 1 })
    })

    test('says what is missing: a boundary or documents', () => {
        const [item] = buildQueue([property(A, { property_boundaries: null, property_documents: [{ count: 0 }] })], [], [])
        expect(item.hasBoundary).toBe(false)
        expect(item.documentCount).toBe(0)
    })

    test('names an untitled property and joins the place', () => {
        const [item] = buildQueue([property(A, { name: null, region: null })], [], [])
        expect(item.name).toBe('Untitled property')
        expect(item.place).toBe('Oyarifa')
    })
})

describe('getPropertyForReview', () => {
    test('refuses an id that is not a uuid before querying, so it never reaches a filter string', async () => {
        const supabase = {
            from: () => {
                throw new Error('should not query')
            },
        }
        // a value that would add a second condition to the overlap filter if it got through
        const result = await getPropertyForReview(supabase as never, `${A},status.eq.detected`)
        expect(result).toBeNull()
    })
})
