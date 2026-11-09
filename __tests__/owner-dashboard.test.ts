import { describe, expect, test } from 'vitest'

import { ownerTodos, propertyStage } from '../lib/owner/dashboard'
import type { OwnPropertySummary } from '../lib/supabase/owner-properties'

function property(fields: Partial<OwnPropertySummary>): OwnPropertySummary {
    return {
        id: 'p1',
        prop_id: 'PROP-abc123',
        name: 'Plot at Oyarifa',
        status: 'under_review',
        city_town: 'Oyarifa',
        region: 'Greater Accra',
        changes_requested_message: null,
        identity_requested: false,
        updated_at: '2026-11-09T10:00:00Z',
        ...fields,
    }
}

const complete = { items: [], complete: true }
const incomplete = { items: [], complete: false }

describe('ownerTodos', () => {
    test("is empty when nothing needs the owner, so the page can say they're all caught up", () => {
        expect(ownerTodos({ properties: [property({ status: 'active' })], checklists: new Map(), identityStatus: 'verified' })).toEqual([])
    })

    test('puts what we asked for first, then identity, then drafts', () => {
        const todos = ownerTodos({
            properties: [
                property({ id: 'd1', status: 'draft', name: null }),
                property({ id: 'w1', status: 'action_required', changes_requested_message: 'Send a clearer site plan.' }),
            ],
            checklists: new Map([['w1', incomplete]]),
            identityStatus: null,
        })
        expect(todos.map((todo) => todo.key)).toEqual(['request-w1', 'identity', 'draft-d1'])
        expect(todos[0]).toMatchObject({ tone: 'waiting', text: 'Send a clearer site plan.', href: '/account/dashboard/properties/w1' })
        expect(todos[2]).toMatchObject({ title: 'Finish registering your property', href: '/account/dashboard/properties/new?draft=d1' })
    })

    test('says to send it back once everything asked for is in', () => {
        const [todo] = ownerTodos({
            properties: [property({ id: 'w1', status: 'action_required' })],
            checklists: new Map([['w1', complete]]),
            identityStatus: 'verified',
        })
        expect(todo).toMatchObject({ tone: 'ready', title: 'Send Plot at Oyarifa back to us', action: 'Send it back' })
    })

    test.each([
        [null, 'Verify your identity'],
        ['rejected', 'Send your identity document again'],
    ] as const)('asks for identity when it is %s', (identityStatus, title) => {
        expect(ownerTodos({ properties: [], checklists: new Map(), identityStatus })[0].title).toBe(title)
    })

    test("doesn't ask for identity while it's being checked or once verified", () => {
        for (const identityStatus of ['unreviewed', 'verified'] as const) {
            expect(ownerTodos({ properties: [], checklists: new Map(), identityStatus })).toEqual([])
        }
    })
})

describe('propertyStage', () => {
    test.each([
        ['draft', 0, 'current'],
        ['submitted', 1, 'done'],
        ['under_review', 2, 'current'],
        ['action_required', 2, 'current'],
        ['active', 3, 'done'],
        ['suspended', 3, 'paused'],
    ])('puts a %s property on step %i (%s)', (status, step, state) => {
        expect(propertyStage(status)).toEqual({ step, state })
    })
})
