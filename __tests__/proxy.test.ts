import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { updateSession } from '../lib/supabase/proxy'

const USER_ID = '11111111-1111-4111-8111-111111111111'

// What the fake Supabase client reports for the request
const session = {
    userId: USER_ID as string | null,
    currentLevel: 'aal1' as 'aal1' | 'aal2' | null,
    nextLevel: 'aal1' as 'aal1' | 'aal2' | null,
    profile: { onboarding_complete: true, role: 'owner' } as { onboarding_complete: boolean; role: string } | null,
}
const signOut = vi.fn()

vi.mock('@supabase/ssr', () => ({
    createServerClient: () => ({
        auth: {
            getClaims: async () => ({ data: session.userId ? { claims: { sub: session.userId } } : null }),
            mfa: {
                getAuthenticatorAssuranceLevel: async () => ({
                    data: { currentLevel: session.currentLevel, nextLevel: session.nextLevel },
                    error: null,
                }),
            },
            signOut,
        },
        from: () => ({
            select: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: session.profile, error: null }) }),
            }),
        }),
    }),
}))

// Where the proxy sends a request for `path`, or null when it lets it through
async function redirectFor(path: string) {
    const response = await updateSession(new NextRequest(`http://localhost${path}`))
    const location = response.headers.get('location')
    return location ? new URL(location).pathname : null
}

function signInAs({
    role = 'owner',
    hasApp = false,
    enteredCode = false,
}: { role?: string; hasApp?: boolean; enteredCode?: boolean } = {}) {
    session.userId = USER_ID
    session.profile = { onboarding_complete: true, role }
    session.currentLevel = enteredCode ? 'aal2' : 'aal1'
    session.nextLevel = hasApp ? 'aal2' : session.currentLevel
}

describe('proxy', () => {
    beforeEach(() => {
        signOut.mockReset()
        signInAs()
    })

    describe('signed out', () => {
        beforeEach(() => {
            session.userId = null
            session.currentLevel = null
            session.nextLevel = null
        })

        test.each(['/admin', '/admin/properties/abc', '/account/security', '/account/dashboard'])(
            'sends %s to the login page',
            async (path) => {
                expect(await redirectFor(path)).toBe('/account/login')
            }
        )

        test('lets the login page and public pages through', async () => {
            expect(await redirectFor('/account/login')).toBeNull()
            expect(await redirectFor('/')).toBeNull()
        })
    })

    describe('signed in with a password, with an authenticator app', () => {
        test('sends an admin from the login page to the security page for their code', async () => {
            signInAs({ role: 'admin', hasApp: true })
            expect(await redirectFor('/account/login')).toBe('/account/security')
        })

        test.each(['/admin', '/account/dashboard', '/account/onboarding'])(
            'sends %s to the security page until the code is entered',
            async (path) => {
                signInAs({ role: 'admin', hasApp: true })
                expect(await redirectFor(path)).toBe('/account/security')
            }
        )

        test('asks owners with an app for their code too', async () => {
            signInAs({ role: 'owner', hasApp: true })
            expect(await redirectFor('/account/dashboard')).toBe('/account/security')
        })

        test('lets the security page through, so the code can be entered there', async () => {
            signInAs({ role: 'admin', hasApp: true })
            expect(await redirectFor('/account/security')).toBeNull()
        })
    })

    describe('admin pages', () => {
        test('let an admin through once they have entered a code', async () => {
            signInAs({ role: 'admin', hasApp: true, enteredCode: true })
            expect(await redirectFor('/admin')).toBeNull()
            expect(await redirectFor('/admin/properties/abc')).toBeNull()
        })

        test('send an admin with no app to the security page to add one', async () => {
            signInAs({ role: 'admin' })
            expect(await redirectFor('/admin')).toBe('/account/security')
        })

        test('send a non-admin to their dashboard, even one who entered a code', async () => {
            signInAs({ role: 'owner', hasApp: true, enteredCode: true })
            expect(await redirectFor('/admin')).toBe('/account/dashboard')
        })

        test('send a signed-in user with no profile to the login page, signing them out', async () => {
            signInAs({ role: 'admin', hasApp: true, enteredCode: true })
            session.profile = null
            expect(await redirectFor('/admin')).toBe('/account/login')
            expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
        })

        test("don't match paths that only start with the same letters", async () => {
            signInAs({ role: 'owner' })
            expect(await redirectFor('/administrators')).toBeNull()
        })
    })

    describe('without an authenticator app', () => {
        test('sends a signed-in owner from the login page to the dashboard, as before', async () => {
            expect(await redirectFor('/account/login')).toBe('/account/dashboard')
        })

        test('lets an owner through to their dashboard', async () => {
            expect(await redirectFor('/account/dashboard')).toBeNull()
        })

        test('still sends users who have not finished onboarding to onboarding', async () => {
            session.profile = { onboarding_complete: false, role: 'owner' }
            expect(await redirectFor('/account/dashboard')).toBe('/account/onboarding')
        })
    })
})
