// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
    openOwnerIdentityPhoto,
    retryIdentityPhotoDeletion,
    reviewIdentityDocument,
} from '../app/admin/properties/[id]/actions'
import { IDENTITY_ERRORS } from '../lib/admin/identity-review'

const OWNER = '11111111-1111-4111-8111-111111111111'
const PATH = `${OWNER}/0b6c.jpg`
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])

const requireAdmin = vi.fn()
const refresh = vi.fn()

vi.mock('@/lib/auth/staff', () => ({ requireAdmin: () => requireAdmin() }))
vi.mock('next/cache', () => ({ refresh: () => refresh() }))
// Nothing here may reach for the service role
vi.mock('@/lib/supabase/service-role', () => ({
    createClient: () => {
        throw new Error('the service role must not be used for identity documents')
    },
}))

// The admin's session: the owner's identity row, the review functions, and the identity bucket
function adminSession(row: Record<string, unknown> | null) {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    const download = vi.fn().mockResolvedValue({ data: new Blob([JPEG], { type: 'image/jpeg' }), error: null })
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/photo' }, error: null })
    const remove = vi.fn().mockResolvedValue({ data: [{ name: PATH }], error: null })
    const supabase = {
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }),
        rpc,
        storage: { from: () => ({ download, createSignedUrl, remove }) },
    }
    requireAdmin.mockResolvedValue({ supabase, adminId: 'admin' })
    return { rpc, download, createSignedUrl, remove }
}

function form(fields: Record<string, string>) {
    const formData = new FormData()
    for (const [name, value] of Object.entries(fields)) formData.set(name, value)
    return formData
}

beforeEach(() => {
    requireAdmin.mockReset()
    refresh.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('openOwnerIdentityPhoto', () => {
    test('checks the caller before anything else', async () => {
        requireAdmin.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'))
        await expect(openOwnerIdentityPhoto(OWNER)).rejects.toThrow()
    })

    test('opens a photo waiting for review through a short-lived link', async () => {
        const { createSignedUrl } = adminSession({ verification_status: 'unreviewed', file_path: PATH })

        expect(await openOwnerIdentityPhoto(OWNER)).toEqual({ kind: 'image', url: 'https://signed.test/photo' })
        expect(createSignedUrl).toHaveBeenCalledWith(PATH, 120)
    })

    test("won't open a document that isn't waiting for review", async () => {
        const { download } = adminSession({ verification_status: 'verified', file_path: PATH })

        expect(await openOwnerIdentityPhoto(OWNER)).toEqual({ error: IDENTITY_ERRORS.notWaiting })
        expect(download).not.toHaveBeenCalled()
    })

    test("won't open a file that isn't what its type says", async () => {
        const { download, createSignedUrl } = adminSession({ verification_status: 'unreviewed', file_path: PATH })
        download.mockResolvedValue({ data: new Blob(['<html>'], { type: 'image/jpeg' }), error: null })

        expect(await openOwnerIdentityPhoto(OWNER)).toEqual({ error: IDENTITY_ERRORS.mismatch })
        expect(createSignedUrl).not.toHaveBeenCalled()
    })

    test("refuses an id that isn't a uuid without reading anything", async () => {
        const { download } = adminSession({ verification_status: 'unreviewed', file_path: PATH })

        expect(await openOwnerIdentityPhoto('../other')).toEqual({ error: IDENTITY_ERRORS.notFound })
        expect(download).not.toHaveBeenCalled()
    })
})

describe('reviewIdentityDocument', () => {
    test('verifies, then deletes the photo and has the database forget it', async () => {
        const { rpc, remove } = adminSession({ verification_status: 'verified', file_path: PATH })

        expect(await reviewIdentityDocument(OWNER, null, form({ status: 'verified', note: '' }))).toBeNull()
        expect(rpc).toHaveBeenNthCalledWith(1, 'review_identity_document', { profile_id: OWNER, verification_status: 'verified', note: '' })
        expect(remove).toHaveBeenCalledWith([PATH])
        expect(rpc).toHaveBeenNthCalledWith(2, 'forget_identity_photo', { profile_id: OWNER })
    })

    test('rejects with a note and leaves the photo for the owner to replace', async () => {
        const { rpc, remove } = adminSession({ verification_status: 'rejected', file_path: PATH })

        expect(await reviewIdentityDocument(OWNER, null, form({ status: 'rejected', note: 'Blurred' }))).toBeNull()
        expect(rpc).toHaveBeenCalledOnce()
        expect(remove).not.toHaveBeenCalled()
    })

    test("says so when the photo couldn't be deleted, and the document stays verified", async () => {
        const { rpc } = adminSession({ verification_status: 'verified', file_path: PATH })
        rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({
            data: null,
            error: { code: '23514', message: 'The photo is still in storage. Try again.' },
        })

        expect(await reviewIdentityDocument(OWNER, null, form({ status: 'verified', note: '' }))).toEqual({
            error: IDENTITY_ERRORS.photoNotDeleted,
        })
    })

    test("doesn't touch the photo when the database refuses the review", async () => {
        const { rpc, remove } = adminSession({ verification_status: 'unreviewed', file_path: PATH })
        rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'This identity document has already been reviewed.' } })

        expect(await reviewIdentityDocument(OWNER, null, form({ status: 'verified', note: '' }))).toEqual({
            error: 'This identity document has already been reviewed.',
        })
        expect(remove).not.toHaveBeenCalled()
    })

    test('needs an outcome before calling the database', async () => {
        const { rpc } = adminSession(null)

        expect(await reviewIdentityDocument(OWNER, null, form({ status: 'unreviewed', note: '' }))).toEqual({
            error: 'Choose verified or rejected',
        })
        expect(rpc).not.toHaveBeenCalled()
    })

    test('never logs the photo path', async () => {
        const { rpc } = adminSession({ verification_status: 'verified', file_path: PATH })
        rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: null, error: { code: 'X', message: 'failed' } })

        await reviewIdentityDocument(OWNER, null, form({ status: 'verified', note: '' }))
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(PATH)
    })
})

describe('retryIdentityPhotoDeletion', () => {
    test('tries the deletion again, trusting the database rather than what storage reported', async () => {
        const { rpc, remove } = adminSession({ verification_status: 'verified', file_path: PATH })
        // an earlier try already deleted the file, so storage reports nothing removed
        remove.mockResolvedValue({ data: [], error: null })

        expect(await retryIdentityPhotoDeletion(OWNER, null)).toBeNull()
        expect(rpc).toHaveBeenCalledWith('forget_identity_photo', { profile_id: OWNER })
        expect(refresh).toHaveBeenCalled()
    })

    test('does nothing for a document that has already lost its photo', async () => {
        const { remove } = adminSession({ verification_status: 'verified', file_path: null })

        expect(await retryIdentityPhotoDeletion(OWNER, null)).toBeNull()
        expect(remove).not.toHaveBeenCalled()
    })
})
