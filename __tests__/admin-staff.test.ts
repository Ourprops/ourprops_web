import { beforeEach, describe, expect, test, vi } from 'vitest'

import { requireAdmin } from '../lib/auth/staff'

const USER_ID = '11111111-1111-4111-8111-111111111111'

// What the fake Supabase client reports: who is signed in, what staff_role() returns, and their profile's role
const session = {
    userId: USER_ID as string | null,
    staffRole: null as string | null,
    staffRoleError: null as Error | null,
    profileRole: 'owner' as string | null,
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            getClaims: async () => ({ data: session.userId ? { claims: { sub: session.userId } } : null }),
        },
        rpc: async () => ({ data: session.staffRole, error: session.staffRoleError }),
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: session.profileRole ? { role: session.profileRole } : null,
                        error: null,
                    }),
                }),
            }),
        }),
    }),
}))

// next/navigation's redirect and notFound end rendering by throwing; these stand-ins throw something testable
vi.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`redirect:${path}`)
    },
    notFound: () => {
        throw new Error('notFound')
    },
}))

describe('requireAdmin', () => {
    beforeEach(() => {
        session.userId = USER_ID
        session.staffRole = null
        session.staffRoleError = null
        session.profileRole = 'owner'
    })

    test('sends a signed-out visitor to log in', async () => {
        session.userId = null
        await expect(requireAdmin()).rejects.toThrow('redirect:/account/login')
    })

    test('gives an owner not found, so the console is not advertised', async () => {
        await expect(requireAdmin()).rejects.toThrow('notFound')
    })

    test('sends an admin who has not entered a code to the security page', async () => {
        // staff_role() is null without aal2 and a verified factor, even for an admin
        session.profileRole = 'admin'
        await expect(requireAdmin()).rejects.toThrow('redirect:/account/security')
    })

    test('lets through an admin the database recognises, with their id', async () => {
        session.profileRole = 'admin'
        session.staffRole = 'admin'
        const result = await requireAdmin()
        expect(result.adminId).toBe(USER_ID)
        expect(result.supabase).toBeDefined()
    })

    test('trusts the database over the profile: a role the database does not recognise gets nothing', async () => {
        // staff_role() only ever returns admin in V1; a partner verifier's profile must not get in
        session.profileRole = 'partner_verifier'
        session.staffRole = null
        await expect(requireAdmin()).rejects.toThrow('notFound')
    })

    test('fails rather than letting anyone in when staff_role() errors', async () => {
        session.profileRole = 'admin'
        session.staffRoleError = new Error('database unavailable')
        await expect(requireAdmin()).rejects.toThrow('database unavailable')
    })
})
