import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { Updates, when } from '../app/account/dashboard/updates'
import type { OwnNotification } from '../lib/supabase/notifications'

const markSeen = vi.fn()
vi.mock('../app/account/dashboard/actions', () => ({ markNotificationsSeen: (ids: string[]) => markSeen(ids) }))

afterEach(cleanup)

const NOW = Date.parse('2026-11-09T12:00:00Z')

function notification(fields: Partial<OwnNotification>): OwnNotification {
    return {
        id: 'n1',
        type: 'property.changes_requested',
        title: 'We need something from you',
        body: 'Send a clearer site plan.',
        action_url: '/account/dashboard/properties/p1',
        read_at: null,
        created_at: '2026-11-09T10:00:00Z',
        ...fields,
    }
}

describe('when', () => {
    test.each([
        ['2026-11-09T11:59:40Z', 'just now'],
        ['2026-11-09T11:45:00Z', '15 minutes ago'],
        ['2026-11-09T10:00:00Z', '2 hours ago'],
        ['2026-11-08T12:00:00Z', 'yesterday'],
        ['2026-11-06T12:00:00Z', '3 days ago'],
        ['2026-10-20T12:00:00Z', '20 Oct'],
    ])('says %s as "%s"', (createdAt, said) => {
        expect(when(createdAt, NOW)).toBe(said)
    })
})

describe('Updates', () => {
    beforeEach(() => markSeen.mockReset())

    test('shows nothing at all before anything has happened', () => {
        const { container } = render(<Updates notifications={[]} />)
        expect(container.innerHTML).toBe('')
    })

    test('marks new updates, links each to where the owner acts, and marks the new ones seen', () => {
        render(
            <Updates
                notifications={[
                    notification({ id: 'n1' }),
                    notification({ id: 'n2', type: 'identity.verified', title: 'Your identity is verified', read_at: '2026-11-08T00:00:00Z', action_url: '/account/identity' }),
                ]}
            />
        )

        expect(screen.getAllByText('New')).toHaveLength(1)
        expect(screen.getByRole('link', { name: /We need something from you/ }).getAttribute('href')).toBe('/account/dashboard/properties/p1')
        expect(screen.getByRole('link', { name: /Your identity is verified/ }).getAttribute('href')).toBe('/account/identity')
        expect(markSeen).toHaveBeenCalledWith(['n1'])
    })

    test("doesn't call the server when nothing is new", () => {
        render(<Updates notifications={[notification({ read_at: '2026-11-08T00:00:00Z' })]} />)
        expect(markSeen).not.toHaveBeenCalled()
    })
})
