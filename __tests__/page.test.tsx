import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Providers from '../components/providers'
import Page from '../app/(marketing)/page'

test('Page', () => {
    render(<Page />, { wrapper: Providers })
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
})
