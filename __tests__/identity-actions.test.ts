// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { saveIdentityDocument } from '../app/account/identity/actions'
import { GENERIC_ACTION_ERROR } from '../lib/action-errors'

const OWNER = '11111111-1111-4111-8111-111111111111'
const nextYear = `${new Date().getFullYear() + 1}-06-30`

const claims = vi.fn()
const rpc = vi.fn()
const existing = vi.fn()
const remove = vi.fn()
const refresh = vi.fn()

vi.mock('next/cache', () => ({ refresh: () => refresh() }))
vi.mock('next/navigation', () => ({
    redirect: (path: string) => {
        throw new Error(`NEXT_REDIRECT ${path}`)
    },
}))
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: { getClaims: () => claims() },
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => existing() }) }) }),
        rpc,
        storage: { from: () => ({ remove }) },
    }),
}))

function form(fields: Record<string, string> = {}) {
    const formData = new FormData()
    const values = {
        document_type: 'ghana_card',
        document_number: ' gha1234567890 ',
        expires_on: nextYear,
        file_path: `${OWNER}/new.jpg`,
        ...fields,
    }
    for (const [name, value] of Object.entries(values)) formData.set(name, value)
    return formData
}

describe('saveIdentityDocument', () => {
    beforeEach(() => {
        claims.mockReset().mockResolvedValue({ data: { claims: { sub: OWNER } } })
        rpc.mockReset().mockResolvedValue({ data: 'id', error: null })
        existing.mockReset().mockResolvedValue({ data: null, error: null })
        remove.mockReset().mockResolvedValue({ data: [], error: null })
        refresh.mockReset()
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    test('sends a signed-out caller to log in before anything else', async () => {
        claims.mockResolvedValue({ data: null })

        await expect(saveIdentityDocument(form())).rejects.toThrow('NEXT_REDIRECT /account/login')
        expect(rpc).not.toHaveBeenCalled()
    })

    test('saves the document with its number in one form, and refreshes the page', async () => {
        expect(await saveIdentityDocument(form())).toBeNull()

        expect(rpc).toHaveBeenCalledWith('save_identity_document', {
            document_type: 'ghana_card',
            issuing_country: 'GH',
            document_number: 'GHA-123456789-0',
            expires_on: nextYear,
            file_path: `${OWNER}/new.jpg`,
        })
        expect(refresh).toHaveBeenCalledOnce()
        expect(remove).not.toHaveBeenCalled()
    })

    test('shows what is wrong with the details without calling the database', async () => {
        expect(await saveIdentityDocument(form({ document_number: '123' }))).toEqual({
            error: 'Enter the number as it is on the card, like GHA-123456789-0.',
        })
        expect(rpc).not.toHaveBeenCalled()
    })

    test("refuses a photo in someone else's folder without calling the database", async () => {
        const result = await saveIdentityDocument(form({ file_path: '22222222-2222-4222-8222-222222222222/theirs.jpg' }))

        expect(result).toEqual({ error: 'Upload a photo or scan of the document.' })
        expect(rpc).not.toHaveBeenCalled()
    })

    test('removes the photo the new document replaces', async () => {
        existing.mockResolvedValue({ data: { file_path: `${OWNER}/old.jpg` }, error: null })

        expect(await saveIdentityDocument(form())).toBeNull()
        expect(remove).toHaveBeenCalledWith([`${OWNER}/old.jpg`])
    })

    test("keeps the old photo when saving fails, as it's still the saved one", async () => {
        existing.mockResolvedValue({ data: { file_path: `${OWNER}/old.jpg` }, error: null })
        rpc.mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'This document is already linked to another account. Contact us if it is yours.' },
        })

        expect(await saveIdentityDocument(form())).toEqual({
            error: 'This document is already linked to another account. Contact us if it is yours.',
        })
        expect(remove).not.toHaveBeenCalled()
        expect(refresh).not.toHaveBeenCalled()
    })

    test("shows the database's messages for an expired or verified document", async () => {
        rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'Your identity is already verified. Contact us to change your document.' } })

        expect(await saveIdentityDocument(form())).toEqual({ error: 'Your identity is already verified. Contact us to change your document.' })
    })

    test('hides any other error, and never logs its details, which can hold the number', async () => {
        rpc.mockResolvedValue({
            data: null,
            error: { code: '23502', message: 'null value', details: 'Failing row contains (GHA-123456789-0)' },
        })

        expect(await saveIdentityDocument(form())).toEqual({ error: GENERIC_ACTION_ERROR })
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('GHA-123456789-0')
    })
})
