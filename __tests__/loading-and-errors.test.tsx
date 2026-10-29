import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import BrandLoader from '../components/brand-loader'
import ErrorView from '../components/error-view'
import NotFound from '../app/not-found'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }))

// Sign-in succeeds straight away, so the test sees what happens after it
vi.mock('@/lib/queries/auth', () => ({
    useSignIn: () => ({
        isPending: false,
        mutate: (_values: unknown, { onSuccess }: { onSuccess: () => void }) => onSuccess(),
    }),
    useSignUp: () => ({ isPending: false, mutate: vi.fn() }),
}))

// The profile the onboarding page reads; each test sets it
const profile = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/lib/queries/profile', () => ({
    useMyProfile: () => ({ data: profile.current, isPending: false, isError: false }),
    useCompleteOnboarding: () => ({ isPending: false, mutate: vi.fn() }),
}))

import LoginPage from '../app/account/login/page'
import OnboardingPage from '../app/account/onboarding/page'

beforeEach(() => replace.mockClear())
afterEach(cleanup)

describe('Loading screen', () => {
    test('tells screen readers what is happening', () => {
        render(<BrandLoader message="Signing you in" />)

        expect(screen.getByRole('status').textContent).toBe('Signing you in…')
    })

    test('appears after signing in, while the dashboard loads', () => {
        render(<LoginPage />)
        expect(screen.queryByText('Signing you in…')).toBeNull()

        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ama@example.com' } })
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-password' } })
        fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

        expect(screen.getByText('Signing you in…')).toBeDefined()
        expect(replace).toHaveBeenCalledWith('/account/dashboard')
    })

    test('appears once onboarding is saved, instead of the form', () => {
        profile.current = { id: 'user-1', full_name: 'Ama Mensah', role: 'owner', phone_number: null, onboarding_complete: true }
        render(<OnboardingPage />)

        expect(screen.getByText('Setting up your account…')).toBeDefined()
        expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    })

    test('stays away while onboarding is still to do', () => {
        profile.current = { id: 'user-1', full_name: 'Ama Mensah', role: 'owner', phone_number: null, onboarding_complete: false }
        render(<OnboardingPage />)

        expect(screen.queryByText('Setting up your account…')).toBeNull()
        expect(screen.getByRole('button', { name: 'Continue' })).toBeDefined()
    })
})

describe('Error page', () => {
    test('tries again when asked', () => {
        const retry = vi.fn()
        render(<ErrorView error={new Error('boom')} retry={retry} />)

        fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

        expect(retry).toHaveBeenCalledOnce()
    })

    test('shows the reference that matches the server logs', () => {
        render(<ErrorView error={Object.assign(new Error('boom'), { digest: '2471983551' })} retry={vi.fn()} />)

        expect(screen.getByText('2471983551')).toBeDefined()
    })

    test("doesn't show the error message outside development", () => {
        render(<ErrorView error={new Error('relation "secret_table" does not exist')} retry={vi.fn()} />)

        expect(screen.queryByText(/secret_table/)).toBeNull()
    })
})

describe('Not found page', () => {
    test('says nothing is at this address and offers a way back', () => {
        render(<NotFound />)

        expect(screen.getByRole('heading', { level: 1, name: 'No record at this address' })).toBeDefined()
        expect(screen.getByText('Go to the homepage').closest('a')?.getAttribute('href')).toBe('/')
        expect(screen.getByText('Go to your dashboard').closest('a')?.getAttribute('href')).toBe('/account/dashboard')
    })
})
