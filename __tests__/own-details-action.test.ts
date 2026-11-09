// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { saveOwnDetails } from '../app/account/details/actions'

const claims = vi.fn()
const update = vi.fn()
const eq = vi.fn()

vi.mock('next/cache', () => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`NEXT_REDIRECT ${path}`)
    },
}))
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getClaims: () => claims() }, from: () => ({ update: (values: unknown) => update(values) }) }),
}))

function form(fields: Record<string, string>) {
    const formData = new FormData()
    for (const [name, value] of Object.entries(fields)) formData.set(name, value)
    return formData
}

describe('saveOwnDetails', () => {
    beforeEach(() => {
        claims.mockReset().mockResolvedValue({ data: { claims: { sub: 'owner-1' } } })
        eq.mockReset().mockResolvedValue({ error: null })
        update.mockReset().mockReturnValue({ eq })
    })

    test("saves the owner's own name and phone, trimmed", async () => {
        expect(await saveOwnDetails(null, form({ full_name: '  Ama Mensah ', phone_number: '024 123 4567' }))).toEqual({ saved: true })
        expect(update).toHaveBeenCalledWith({ full_name: 'Ama Mensah', phone_number: '024 123 4567' })
        expect(eq).toHaveBeenCalledWith('id', 'owner-1')
    })

    test('says what is wrong without saving', async () => {
        expect(await saveOwnDetails(null, form({ full_name: 'A', phone_number: '024 123 4567' }))).toEqual({ error: 'Enter your full name.' })
        expect(await saveOwnDetails(null, form({ full_name: 'Ama Mensah', phone_number: 'call me' }))).toEqual({ error: 'Enter a valid phone number.' })
        expect(update).not.toHaveBeenCalled()
    })

    test('sends a signed-out caller to log in', async () => {
        claims.mockResolvedValue({ data: null })
        await expect(saveOwnDetails(null, form({ full_name: 'Ama Mensah', phone_number: '024 123 4567' }))).rejects.toThrow('NEXT_REDIRECT /account/login')
    })
})
