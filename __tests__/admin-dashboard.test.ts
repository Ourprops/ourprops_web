import { describe, expect, test } from 'vitest'

import { awaitingReview, formatCount, mapStatus, pipeline, submittedTotal } from '../lib/admin/dashboard'

const PROPERTIES = { draft: 5, submitted: 2, under_review: 3, action_required: 1, active: 4 }

describe('admin dashboard numbers', () => {
    test('counts everything sent to us, leaving drafts out', () => {
        expect(submittedTotal(PROPERTIES)).toBe(10)
    })

    test('counts what a reviewer has to act on: sent, or in review', () => {
        expect(awaitingReview(PROPERTIES)).toBe(5)
    })

    test('lists the pipeline in review order, with nothing as zero', () => {
        expect(pipeline(PROPERTIES).map((stage) => [stage.status, stage.count])).toEqual([
            ['draft', 5],
            ['submitted', 2],
            ['under_review', 3],
            ['action_required', 1],
            ['active', 4],
            ['suspended', 0],
        ])
    })

    test('puts each status on the map as verified, being checked, or paused', () => {
        expect(['active', 'submitted', 'under_review', 'action_required', 'suspended'].map(mapStatus)).toEqual([
            'active',
            'checking',
            'checking',
            'checking',
            'suspended',
        ])
    })

    test('writes counts in full until they get large', () => {
        expect(formatCount(1284)).toBe('1,284')
        expect(formatCount(12_900)).toBe('12.9K')
    })
})
