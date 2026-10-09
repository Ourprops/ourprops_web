import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Waitlist from '../app/(marketing)/_components/waitlist'
import { POST } from '../app/api/marketing/waitlist/route'
import { HOME_DEFAULTS } from '../lib/content/defaults'

const insert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ from: () => ({ insert }) }),
}))

function postWaitlist(body: unknown) {
    return POST(
        new Request('http://localhost/api/marketing/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: typeof body === 'string' ? body : JSON.stringify(body),
        })
    )
}

describe('POST /api/marketing/waitlist', () => {
    beforeEach(() => {
        insert.mockReset()
        vi.spyOn(console, 'log').mockImplementation(() => {})
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('saves a valid signup with a normalised email', async () => {
        insert.mockResolvedValue({ error: null })

        const response = await postWaitlist({ email: '  Jane@Example.COM ', role: 'Property Owner' })

        expect(response.status).toBe(201)
        expect(await response.json()).toEqual({ ok: true })
        expect(insert).toHaveBeenCalledWith({ email: 'jane@example.com', role: 'Property Owner' })
    })

    test('rejects an invalid payload without touching the database', async () => {
        const response = await postWaitlist({ email: 'not-an-email', role: 'Landlord' })
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body.fieldErrors.email).toBeDefined()
        expect(body.fieldErrors.role).toBeDefined()
        expect(insert).not.toHaveBeenCalled()
    })

    test('returns 409 when the email is already on the waitlist', async () => {
        insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })

        const response = await postWaitlist({ email: 'jane@example.com', role: 'Other' })

        expect(response.status).toBe(409)
        expect(await response.json()).toEqual({ error: 'This email is already on the waitlist.' })
    })

    test('returns 500 when the insert fails for another reason', async () => {
        insert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } })

        const response = await postWaitlist({ email: 'jane@example.com', role: 'Other' })

        expect(response.status).toBe(500)
    })

    test('returns 500 for a malformed JSON body', async () => {
        const response = await postWaitlist('{not json')

        expect(response.status).toBe(500)
        expect(insert).not.toHaveBeenCalled()
    })
})

describe('Waitlist form', () => {
    afterEach(() => {
        cleanup()
        vi.unstubAllGlobals()
    })

    test('shows validation errors and does not submit when fields are missing', () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)

        render(
            <QueryClientProvider client={new QueryClient()}>
                <Waitlist content={HOME_DEFAULTS.waitlist} />
            </QueryClientProvider>
        )

        fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'nope' } })
        fireEvent.click(screen.getByRole('button', { name: HOME_DEFAULTS.waitlist.submitLabel }))

        expect(screen.getByText('Enter a valid email address.')).toBeDefined()
        expect(screen.getByText('Choose the option that describes you best.')).toBeDefined()
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
