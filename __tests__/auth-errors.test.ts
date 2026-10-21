import { describe, expect, test } from 'vitest'

import { formatAuthError } from '../lib/supabase/auth'

describe('formatAuthError for second-factor errors', () => {
    test('explains a wrong code, matched by its code rather than its message', () => {
        const error = formatAuthError({ message: 'Invalid TOTP code entered', status: 422, code: 'mfa_verification_failed' })

        expect(error.message).toMatch(/That code didn't work/)
        expect(error.code).toBe('mfa_verification_failed')
    })

    test('explains a code entered too late', () => {
        expect(formatAuthError({ message: 'expired', code: 'mfa_challenge_expired' }).message).toMatch(/took too long/)
    })

    test('explains a duplicate app name', () => {
        expect(formatAuthError({ message: 'conflict', code: 'mfa_factor_name_conflict' }).message).toMatch(/already have an app/)
    })

    test('asks for a code when an action needs one', () => {
        expect(formatAuthError({ message: 'AAL2 required', code: 'insufficient_aal' }).message).toMatch(/Enter a code/)
    })
})
