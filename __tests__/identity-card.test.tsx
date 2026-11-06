import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import { IdentityCard } from '../app/account/dashboard/identity-card'

describe('IdentityCard', () => {
    afterEach(cleanup)

    test('asks an owner with no document to verify, linking to the identity page', () => {
        render(<IdentityCard status={null} />)
        expect(screen.getByRole('link', { name: /Verify your identity/ }).getAttribute('href')).toBe('/account/identity')
    })

    test('tells an owner whose document was turned down to add it again', () => {
        render(<IdentityCard status="rejected" />)
        expect(screen.getByText("Your identity document wasn't accepted")).toBeTruthy()
    })

    test('says a saved document is being checked', () => {
        render(<IdentityCard status="unreviewed" />)
        expect(screen.getByText("We're checking your identity document")).toBeTruthy()
    })

    test('shows nothing once the identity is verified', () => {
        const { container } = render(<IdentityCard status="verified" />)
        expect(container.innerHTML).toBe('')
    })
})
