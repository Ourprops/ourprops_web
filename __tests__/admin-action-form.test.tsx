import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ActionForm } from '../components/action-form'

describe('ActionForm', () => {
    afterEach(cleanup)

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
})
