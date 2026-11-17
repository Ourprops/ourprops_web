import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const toast = vi.hoisted(() => ({ success: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

import { ActionForm } from '../components/action-form'

describe('ActionForm', () => {
    afterEach(() => {
        cleanup()
        toast.success.mockClear()
    })

    test('keeps what the admin typed when the database refuses it, and shows why', async () => {
        const action = vi.fn().mockResolvedValue({ error: 'Add a public note saying why.' })

        render(
            <ActionForm action={action} submitLabel="Save">
                <textarea aria-label="Note" name="note" defaultValue="" />
            </ActionForm>
        )

        const note = screen.getByLabelText('Note') as HTMLTextAreaElement
        fireEvent.change(note, { target: { value: 'Half a page of careful reasoning' } })
        fireEvent.submit(note.form!)

        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Add a public note saying why.')
        // React 19 resets a form after a form action; this one has to survive that
        expect(note.value).toBe('Half a page of careful reasoning')
        expect((action.mock.calls[0][1] as FormData).get('note')).toBe('Half a page of careful reasoning')
    })

    test('turns the button off while it is blocked', async () => {
        render(<ActionForm action={vi.fn()} submitLabel="Approve" disabled />)
        await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toHaveProperty('disabled', true))
    })

    test('confirms with its success message once the action goes through', async () => {
        render(<ActionForm action={vi.fn().mockResolvedValue(null)} submitLabel="Approve" successMessage="Property approved" />)
        fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Property approved'))
    })

    test('says "Saved" when no message is given', async () => {
        render(<ActionForm action={vi.fn().mockResolvedValue(null)} submitLabel="Save" />)
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Saved'))
    })

    test('never claims success when the database refuses it, or before anything is sent', async () => {
        render(<ActionForm action={vi.fn().mockResolvedValue({ error: 'Not allowed now.' })} submitLabel="Approve" />)
        expect(toast.success).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
        await screen.findByRole('alert')
        expect(toast.success).not.toHaveBeenCalled()
    })
})
