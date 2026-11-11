import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import ProductDemo from '../app/(public)/_components/product-demo'

function prefersReducedMotion(reduce: boolean) {
    window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: reduce,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }))
}

const heading = () => screen.getByRole('heading', { level: 3 }).textContent

describe('ProductDemo', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => {
        cleanup()
        vi.useRealTimers()
    })

    test('plays through the steps on its own', () => {
        prefersReducedMotion(false)
        render(<ProductDemo />)
        expect(heading()).toBe('Mark it on the map')

        act(() => vi.advanceTimersByTime(4200))
        expect(heading()).toBe('Add your documents')
        // each step schedules the next once React has rendered it, so time moves on a step at a time
        for (let step = 0; step < 4; step++) act(() => vi.advanceTimersByTime(4200))
        expect(heading()).toBe('Mark it on the map')
    })

    test('shows any step when its tab is chosen', () => {
        prefersReducedMotion(false)
        render(<ProductDemo />)

        fireEvent.click(screen.getByRole('tab', { name: /We check it/ }))
        expect(heading()).toBe('We check it')
        expect(screen.getByRole('tab', { name: /We check it/ }).getAttribute('aria-selected')).toBe('true')
    })

    test('stops when paused, and goes on when played', () => {
        prefersReducedMotion(false)
        render(<ProductDemo />)

        fireEvent.click(screen.getByRole('button', { name: 'Pause the walkthrough' }))
        act(() => vi.advanceTimersByTime(10_000))
        expect(heading()).toBe('Mark it on the map')

        fireEvent.click(screen.getByRole('button', { name: 'Play the walkthrough' }))
        act(() => vi.advanceTimersByTime(4200))
        expect(heading()).toBe('Add your documents')
    })

    test("doesn't play on its own for someone who asked for less motion, but Play still works", () => {
        prefersReducedMotion(true)
        render(<ProductDemo />)

        act(() => vi.advanceTimersByTime(10_000))
        expect(heading()).toBe('Mark it on the map')

        fireEvent.click(screen.getByRole('button', { name: 'Play the walkthrough' }))
        act(() => vi.advanceTimersByTime(4200))
        expect(heading()).toBe('Add your documents')
    })

    test('holds still while the visitor points at it', () => {
        prefersReducedMotion(false)
        const { container } = render(<ProductDemo />)

        fireEvent.mouseEnter(container.firstElementChild as Element)
        act(() => vi.advanceTimersByTime(10_000))
        expect(heading()).toBe('Mark it on the map')
    })

    test("shows only what OurProps does: no sharing documents with named people", () => {
        prefersReducedMotion(false)
        render(<ProductDemo />)
        for (const tab of screen.getAllByRole('tab')) {
            fireEvent.click(tab)
            expect(document.body.textContent).not.toMatch(/Shared with|Lawyer|Prospective buyer/)
        }
    })
})
