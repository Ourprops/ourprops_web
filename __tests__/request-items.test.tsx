import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import { RequestItems } from '../app/admin/properties/[id]/request-items'

afterEach(cleanup)

describe('RequestItems', () => {
    test('shows no note boxes until an item is ticked', () => {
        render(<RequestItems offerIdentity />)
        expect(screen.queryByLabelText(/What to send, and why/)).toBeNull()
    })

    test("opens a required note for a ticked item, and closes it again when it's unticked", () => {
        render(<RequestItems offerIdentity />)
        const sitePlan = screen.getAllByRole('checkbox')[1]

        fireEvent.click(sitePlan)
        const note = screen.getByLabelText(/What to send, and why/) as HTMLTextAreaElement
        expect(note.name).toBe('note_site_plan')
        expect(note.required).toBe(true)

        fireEvent.click(sitePlan)
        expect(screen.queryByLabelText(/What to send, and why/)).toBeNull()
    })

    test('offers the identity document only while it is not verified', () => {
        const { rerender } = render(<RequestItems offerIdentity />)
        expect(screen.getByLabelText(/Their identity document/)).toBeTruthy()

        rerender(<RequestItems offerIdentity={false} />)
        expect(screen.queryByLabelText(/Their identity document/)).toBeNull()
    })
})
