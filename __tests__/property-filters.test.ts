import { describe, expect, test } from 'vitest'

import { filterCounts, filterProperties } from '../lib/owner/property-filters'
import type { OwnPropertySummary } from '../lib/supabase/owner-properties'

function property(id: string, status: string, fields: Partial<OwnPropertySummary> = {}): OwnPropertySummary {
    return {
        id,
        prop_id: `PROP-${id}`,
        name: `Plot ${id}`,
        status,
        city_town: 'Oyarifa',
        region: 'Greater Accra',
        changes_requested_message: null,
        identity_requested: false,
        updated_at: '2026-11-10T09:00:00Z',
        ...fields,
    }
}

const PROPERTIES = [
    property('a1', 'action_required'),
    property('b2', 'under_review', { city_town: 'Kasoa', region: 'Central' }),
    property('c3', 'submitted'),
    property('d4', 'active', { name: 'House at Adenta' }),
    property('e5', 'draft'),
]

describe('filterProperties', () => {
    test.each([
        ['all', ['a1', 'b2', 'c3', 'd4', 'e5']],
        ['needs_you', ['a1']],
        ['checking', ['b2', 'c3']],
        ['verified', ['d4']],
        ['drafts', ['e5']],
        ['paused', []],
    ] as const)('shows %s', (filter, ids) => {
        expect(filterProperties(PROPERTIES, filter, '').map((each) => each.id)).toEqual(ids)
    })

    test('searches name, reference and place, ignoring case', () => {
        expect(filterProperties(PROPERTIES, 'all', '  adenta ').map((each) => each.id)).toEqual(['d4'])
        expect(filterProperties(PROPERTIES, 'all', 'prop-c3').map((each) => each.id)).toEqual(['c3'])
        expect(filterProperties(PROPERTIES, 'all', 'kasoa').map((each) => each.id)).toEqual(['b2'])
    })

    test('combines the search with the filter', () => {
        expect(filterProperties(PROPERTIES, 'checking', 'oyarifa').map((each) => each.id)).toEqual(['c3'])
    })
})

describe('filterCounts', () => {
    test('counts each filter, for the numbers beside them', () => {
        expect(filterCounts(PROPERTIES)).toEqual({ all: 5, needs_you: 1, checking: 2, verified: 1, paused: 0, drafts: 1 })
    })
})
