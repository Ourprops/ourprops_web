// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { findIdentityHolder, releaseIdentityDocument } from '../app/admin/identity/actions'
import { GENERIC_ACTION_ERROR } from '../lib/action-errors'

const HOLDER = '33333333-3333-4333-8333-333333333333'

const requireAdmin = vi.fn()
const rpc = vi.fn()
const serviceRemove = vi.fn()
const serviceRoleUsed = vi.fn()

vi.mock('@/lib/auth/staff', () => ({ requireAdmin: () => requireAdmin() }))
vi.mock('@/lib/supabase/service-role', () => ({
    createClient: () => {
        serviceRoleUsed()
        return { storage: { from: () => ({ remove: serviceRemove }) } }
    },
}))

function form(fields: Record<string, string>) {
    const formData = new FormData()
    for (const [name, value] of Object.entries(fields)) formData.set(name, value)
    return formData
}

beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue({ supabase: { rpc }, adminId: 'admin' })
    rpc.mockReset()
    serviceRemove.mockReset().mockResolvedValue({ data: [{}], error: null })
    serviceRoleUsed.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('findIdentityHolder', () => {
    const holder = { profile_id: HOLDER, full_name: 'Yaw Asante', email: 'yaw@example.test', phone_number: '+233', verification_status: 'verified' }

    test('checks the caller before anything else', async () => {
        requireAdmin.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'))
        await expect(findIdentityHolder(null, form({ document_type: 'ghana_card', document_number: 'GHA-123456789-0' }))).rejects.toThrow()
        expect(rpc).not.toHaveBeenCalled()
    })

    test('looks the number up written the way it was saved, and shows the holder', async () => {
        rpc.mockResolvedValue({ data: [holder], error: null })

        expect(await findIdentityHolder(null, form({ document_type: 'ghana_card', document_number: 'gha 1234567890' }))).toEqual({
            holder,
            searched: true,
        })
        expect(rpc).toHaveBeenCalledWith('find_identity_document_holder', {
            document_type: 'ghana_card',
            issuing_country: 'GH',
            document_number: 'GHA-123456789-0',
        })
    })

    test('says when nobody holds the number', async () => {
        rpc.mockResolvedValue({ data: [], error: null })

        expect(await findIdentityHolder(null, form({ document_type: 'passport', issuing_country: 'gb', document_number: '123456789' }))).toEqual({
            holder: null,
            searched: true,
        })
    })

    test("refuses a number that can't be one without calling the database", async () => {
        expect(await findIdentityHolder(null, form({ document_type: 'ghana_card', document_number: '12' }))).toEqual({
            error: 'Enter the number as it is on the card, like GHA-123456789-0.',
        })
        expect(rpc).not.toHaveBeenCalled()
    })

    test('never logs the number it looked up', async () => {
        rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'connection failed', details: 'GHA-123456789-0' } })

        expect(await findIdentityHolder(null, form({ document_type: 'ghana_card', document_number: 'GHA-123456789-0' }))).toEqual({
            error: GENERIC_ACTION_ERROR,
        })
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('123456789')
    })
})

describe('releaseIdentityDocument', () => {
    test('checks the caller before anything else', async () => {
        requireAdmin.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'))
        await expect(releaseIdentityDocument(HOLDER, null, form({ reason: 'Proved on a call' }))).rejects.toThrow()
        expect(rpc).not.toHaveBeenCalled()
        expect(serviceRoleUsed).not.toHaveBeenCalled()
    })

    test('needs a reason before calling the database', async () => {
        expect(await releaseIdentityDocument(HOLDER, null, form({ reason: '  ' }))).toEqual({
            error: 'Say why the document is released, for example how the owner proved it is theirs',
        })
        expect(rpc).not.toHaveBeenCalled()
    })

    test('releases a verified document, which has no photo left, without the service role', async () => {
        rpc.mockResolvedValue({ data: null, error: null })

        expect(await releaseIdentityDocument(HOLDER, null, form({ reason: ' Proved on a call ' }))).toEqual({ released: true })
        expect(rpc).toHaveBeenCalledWith('release_identity_document', { profile_id: HOLDER, reason: 'Proved on a call' })
        expect(serviceRoleUsed).not.toHaveBeenCalled()
    })

    test("deletes the photo the database hands back, and only that one, once it's released", async () => {
        rpc.mockResolvedValue({ data: `${HOLDER}/passport.jpg`, error: null })

        expect(await releaseIdentityDocument(HOLDER, null, form({ reason: 'Duplicate account' }))).toEqual({ released: true })
        expect(serviceRemove).toHaveBeenCalledWith([`${HOLDER}/passport.jpg`])
    })

    test("won't delete a path outside the account's own folder", async () => {
        rpc.mockResolvedValue({ data: 'someone-else/passport.jpg', error: null })

        expect(await releaseIdentityDocument(HOLDER, null, form({ reason: 'Duplicate account' }))).toEqual({ released: true })
        expect(serviceRoleUsed).not.toHaveBeenCalled()
    })

    test("says so when the photo couldn't be deleted", async () => {
        rpc.mockResolvedValue({ data: `${HOLDER}/passport.jpg`, error: null })
        serviceRemove.mockResolvedValue({ data: null, error: { message: 'storage down' } })

        expect(await releaseIdentityDocument(HOLDER, null, form({ reason: 'Duplicate account' }))).toEqual({
            error: "The document is released, but its photo couldn't be deleted. Tell a developer, with the account's email.",
        })
    })

    test("touches no files when the database refuses", async () => {
        rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Identity document not found.' } })

        expect(await releaseIdentityDocument(HOLDER, null, form({ reason: 'Duplicate account' }))).toEqual({
            error: 'Identity document not found.',
        })
        expect(serviceRoleUsed).not.toHaveBeenCalled()
    })
})
