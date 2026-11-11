import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { GhanaCardInput } from '../app/account/identity/ghana-card-input'
import { PhotoPicker } from '../app/account/identity/photo-picker'

// Each test starts with an empty page
afterEach(cleanup)

describe('GhanaCardInput', () => {
    function posted(container: HTMLElement) {
        return (container.querySelector('input[name="document_number"]') as HTMLInputElement).value
    }

    test('shows GHA- already filled in, and opens the number pad', () => {
        render(<GhanaCardInput />)
        expect(screen.getByText('GHA-')).toBeTruthy()
        expect(screen.getByLabelText('Personal ID Number').getAttribute('inputmode')).toBe('numeric')
    })

    test('adds the dash itself and posts the number as printed', () => {
        const { container } = render(<GhanaCardInput />)
        const input = screen.getByLabelText('Personal ID Number') as HTMLInputElement

        fireEvent.change(input, { target: { value: '1234567890' } })
        expect(input.value).toBe('123456789-0')
        expect(posted(container)).toBe('GHA-123456789-0')
        expect(screen.getByLabelText('Complete')).toBeTruthy()
    })

    test('takes the whole number pasted from somewhere else', () => {
        const { container } = render(<GhanaCardInput />)
        fireEvent.change(screen.getByLabelText('Personal ID Number'), { target: { value: 'GHA-123456789-0' } })
        expect(posted(container)).toBe('GHA-123456789-0')
    })

    test('says how many digits are still missing', () => {
        render(<GhanaCardInput />)
        fireEvent.change(screen.getByLabelText('Personal ID Number'), { target: { value: '1234567' } })
        expect(screen.getByText(/3 more to go/)).toBeTruthy()
    })
})

describe('PhotoPicker', () => {
    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:preview')
        URL.revokeObjectURL = vi.fn()
    })
    afterEach(() => vi.restoreAllMocks())

    // The form keeps the chosen file, as identity-form does
    function Picker() {
        const [file, setFile] = useState<File | null>(null)
        return <PhotoPicker label="Photo of the front of your card" file={file} onChange={setFile} />
    }

    function choose(file: File) {
        fireEvent.change(screen.getByLabelText('Photo of the front of your card'), { target: { files: [file] } })
    }

    test('shows the photo picked, so the owner can check it is readable', () => {
        render(<Picker />)
        choose(new File(['x'], 'card.jpg', { type: 'image/jpeg' }))

        expect((screen.getByAltText('The photo you picked') as HTMLImageElement).src).toBe('blob:preview')
        expect(screen.getByText(/card\.jpg/)).toBeTruthy()
    })

    test('removes the photo picked, and frees its preview', () => {
        render(<Picker />)
        choose(new File(['x'], 'card.jpg', { type: 'image/jpeg' }))
        fireEvent.click(screen.getByRole('button', { name: /Remove/ }))

        expect(screen.queryByAltText('The photo you picked')).toBeNull()
        expect(screen.getByText('Take or choose a photo')).toBeTruthy()
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    })

    test('shows a PDF by name rather than as an image', () => {
        render(<Picker />)
        choose(new File(['x'], 'card.pdf', { type: 'application/pdf' }))

        expect(screen.getByText('PDF ready to send')).toBeTruthy()
        expect(URL.createObjectURL).not.toHaveBeenCalled()
    })

    test('turns down a HEIC photo straight away, before anything is uploaded', () => {
        render(<Picker />)
        choose(new File(['x'], 'IMG_1.HEIC', { type: 'image/heic' }))

        expect(screen.getByRole('alert').textContent).toBe('Choose a photo (JPEG, PNG or WebP) or a PDF.')
        expect(screen.getByText('Take or choose a photo')).toBeTruthy()
    })

    test('turns down a file over 10 MB straight away', () => {
        render(<Picker />)
        const big = new File(['x'], 'card.jpg', { type: 'image/jpeg' })
        Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
        choose(big)

        expect(screen.getByRole('alert').textContent).toMatch(/larger than 10 MB/)
    })
})
