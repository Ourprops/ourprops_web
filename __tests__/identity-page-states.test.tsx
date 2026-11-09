import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { IdentityForm } from '../app/account/identity/identity-form'
import { IdentitySteps } from '../app/account/identity/identity-steps'
import { ReplaceDocument } from '../app/account/identity/replace-document'

const OWNER = '11111111-1111-4111-8111-111111111111'

const upload = vi.fn()
const remove = vi.fn()
const save = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ storage: { from: () => ({ upload, remove }) } }),
}))
vi.mock('../app/account/identity/actions', () => ({ saveIdentityDocument: (formData: FormData) => save(formData) }))

afterEach(cleanup)

describe('IdentitySteps', () => {
    test('shows a sent document as sent, and being checked now', () => {
        render(<IdentitySteps status="unreviewed" />)
        expect(screen.getByText(', done').parentElement?.textContent).toBe('Sent, done')
        expect(screen.getByText(/Checked by our team/).textContent).toBe('Checked by our team, happening now')
        expect(screen.getByText(/^Verified/).textContent).toBe('Verified, to come')
    })

    test('shows a turned-down document as not accepted', () => {
        render(<IdentitySteps status="rejected" />)
        expect(screen.getByText(/Not accepted/).textContent).toBe('Not accepted, failed')
    })

    test('shows every step done once verified', () => {
        render(<IdentitySteps status="verified" />)
        expect(screen.getAllByText(', done')).toHaveLength(3)
    })
})

describe('ReplaceDocument', () => {
    test('keeps the form out of the way until the owner asks to replace the document', () => {
        render(<ReplaceDocument profileId={OWNER} />)
        expect(screen.queryByText('Send my document')).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: 'Sent the wrong document? Replace it' }))
        expect(screen.getByText('Send my document')).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
        expect(screen.queryByText('Send my document')).toBeNull()
    })
})

describe('IdentityForm while sending', () => {
    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:preview')
        URL.revokeObjectURL = vi.fn()
        upload.mockReset()
        remove.mockReset().mockResolvedValue({ data: [], error: null })
        save.mockReset()
    })

    function fillIn() {
        render(<IdentityForm profileId={OWNER} />)
        fireEvent.change(screen.getByLabelText('Personal ID Number'), { target: { value: '1234567890' } })
        fireEvent.change(screen.getByLabelText('Expiry date'), { target: { value: `${new Date().getFullYear() + 1}-06-30` } })
        fireEvent.change(screen.getByLabelText('Photo of the front of your card'), {
            target: { files: [new File(['x'], 'card.jpg', { type: 'image/jpeg' })] },
        })
    }

    // Promises the test settles itself, so it can look at the form between the upload and the save
    function deferred<T>() {
        let resolve!: (value: T) => void
        const promise = new Promise<T>((done) => (resolve = done))
        return { promise, resolve }
    }

    test('says what it is waiting on, and locks the fields until it is done', async () => {
        const uploaded = deferred<{ error: null }>()
        const saved = deferred<null>()
        upload.mockReturnValue(uploaded.promise)
        save.mockReturnValue(saved.promise)
        fillIn()

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send my document' })))
        expect(screen.getByRole('button', { name: /Uploading your photo/ })).toBeTruthy()
        expect((screen.getByLabelText('Personal ID Number') as HTMLInputElement).closest('fieldset[disabled]')).not.toBeNull()

        await act(async () => uploaded.resolve({ error: null }))
        expect(screen.getByRole('button', { name: /Saving your details/ })).toBeTruthy()

        await act(async () => saved.resolve(null))
        expect(save.mock.calls[0][0].get('document_number')).toBe('GHA-123456789-0')
    })

    test("removes the uploaded photo and says why when the details aren't accepted", async () => {
        upload.mockResolvedValue({ error: null })
        save.mockResolvedValue({ error: 'This document is already linked to another account. Contact us if it is yours.' })
        fillIn()

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send my document' })))

        expect(remove).toHaveBeenCalledOnce()
        expect(screen.getByRole('alert').textContent).toBe('This document is already linked to another account. Contact us if it is yours.')
        expect(screen.getByRole('button', { name: 'Send my document' })).toBeTruthy()
    })
})
