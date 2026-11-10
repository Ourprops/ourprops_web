import { describe, expect, test } from 'vitest'

import { ownerChecks } from '../lib/owner/checks'

const at = '2026-11-10T09:00:00Z'

describe('ownerChecks', () => {
    test('lists all seven checks in the public order, not started until the review creates them', () => {
        const checks = ownerChecks([])
        expect(checks).toHaveLength(7)
        expect(checks[0]).toEqual({ key: 'identity_verified', title: "The owner's identity", state: 'not_started', note: null })
    })

    test.each([
        ['verified', 'checked'],
        ['flagged', 'attention'],
        ['in_progress', 'checking'],
        ['submitted', 'checking'],
        ['waived', 'skipped'],
        ['unverified', 'not_started'],
    ])('says a %s check is %s', (status, state) => {
        const [check] = ownerChecks([{ checkpoint_key: 'identity_verified', status, public_notes: null, updated_at: at }])
        expect(check.state).toBe(state)
    })

    test('shows the note only where it explains something: a flag, or a check we skipped', () => {
        const checks = ownerChecks([
            { checkpoint_key: 'official_search_status', status: 'flagged', public_notes: 'A caveat is on this land.', updated_at: at },
            { checkpoint_key: 'cadastral_cross_check', status: 'waived', public_notes: 'No cadastral plan exists here.', updated_at: at },
            { checkpoint_key: 'boundary_mapped', status: 'verified', public_notes: 'Looks good', updated_at: at },
        ])
        const note = (key: string) => checks.find((check) => check.key === key)?.note
        expect(note('official_search_status')).toBe('A caveat is on this land.')
        expect(note('cadastral_cross_check')).toBe('No cadastral plan exists here.')
        expect(note('boundary_mapped')).toBeNull()
    })
})
