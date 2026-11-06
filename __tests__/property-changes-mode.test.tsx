import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import ProgressIndicator from '../app/account/dashboard/properties/new/_components/progress-indicator'
import Review from '../app/account/dashboard/properties/new/_components/review'
import type { SavedDraft } from '../lib/validators/property'
import { useNewPropertyStore } from '../stores/new-property-store'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const PROPERTY_ID = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const SAVED_AT = '2026-11-03T12:00:00.000Z'

// A property an admin has asked the owner to change, as the flow loads it
const IN_CHANGES: SavedDraft = {
    id: PROPERTY_ID,
    updatedAt: SAVED_AT,
    status: 'action_required',
    details: { name: 'East Legon house', type: 'residential' },
    location: { region: 'Greater Accra', city: 'East Legon' },
    boundary: null,
    acquisition: { method: 'inheritance', metadata: {} },
}

// Saves echo what was sent; the documents list is empty
const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (!init?.method || init.method === 'GET') return { ok: true, status: 200, json: async () => [] }
    const body = JSON.parse(init.body as string)
    return { ok: true, status: 200, json: async () => ({ id: PROPERTY_ID, updatedAt: SAVED_AT, status: 'action_required', ...body }) }
})

function renderWithQuery(ui: ReactNode) {
    return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    useNewPropertyStore.getState().reset()
})

afterEach(() => {
    cleanup()
    fetchMock.mockClear()
    push.mockClear()
    vi.unstubAllGlobals()
})

describe('the flow while an admin has asked for changes', () => {
    test('loads in changes mode, and a draft in draft mode', () => {
        useNewPropertyStore.getState().loadDraft(IN_CHANGES)
        expect(useNewPropertyStore.getState().mode).toBe('changes')

        useNewPropertyStore.getState().loadDraft({ ...IN_CHANGES, status: 'draft' })
        expect(useNewPropertyStore.getState().mode).toBe('draft')
    })

    test('skips the documents screen, which the requests on the property page replace', () => {
        const store = useNewPropertyStore.getState()
        store.loadDraft(IN_CHANGES)
        store.setScreen('acquisition')
        store.handleNext()
        expect(useNewPropertyStore.getState().screen).toBe('review')

        useNewPropertyStore.getState().handleBack()
        expect(useNewPropertyStore.getState().screen).toBe('acquisition')
    })

    test("doesn't go back past the first screen to the start screen", () => {
        useNewPropertyStore.getState().loadDraft(IN_CHANGES)
        useNewPropertyStore.getState().handleBack()
        expect(useNewPropertyStore.getState().screen).toBe('details')
    })

    test('a draft still goes through the documents screen', () => {
        const store = useNewPropertyStore.getState()
        store.loadDraft({ ...IN_CHANGES, status: 'draft' })
        store.setScreen('acquisition')
        store.handleNext()
        expect(useNewPropertyStore.getState().screen).toBe('documents')
    })

    test('review has no declaration or submit, and saves then goes back to the property page', async () => {
        useNewPropertyStore.getState().loadDraft(IN_CHANGES)
        useNewPropertyStore.getState().setScreen('review')
        renderWithQuery(<Review />)

        expect(screen.queryByText('I confirm')).toBeNull()
        expect(screen.queryByRole('button', { name: /submit for review/i })).toBeNull()
        // Documents can't be changed from here, and missing ones aren't listed as gaps
        expect(screen.queryByRole('button', { name: /edit documents/i })).toBeNull()
        expect(screen.queryByText(/no ownership document yet/i)).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: /save and go back/i }))

        await waitFor(() => expect(push).toHaveBeenCalledWith(`/account/dashboard/properties/${PROPERTY_ID}`))
        expect(fetchMock).toHaveBeenCalledWith(`/api/property/draft/${PROPERTY_ID}`, expect.objectContaining({ method: 'PATCH' }))
    })

    test('a draft review still has the declaration and lets the owner edit documents', () => {
        useNewPropertyStore.getState().loadDraft({ ...IN_CHANGES, status: 'draft' })
        useNewPropertyStore.getState().setScreen('review')
        renderWithQuery(<Review />)

        expect(screen.getByText('I confirm')).toBeTruthy()
        expect(screen.getByRole('button', { name: /edit documents/i })).toBeTruthy()
    })

    test('the exit dialog offers no delete, since only drafts are ever deleted', () => {
        useNewPropertyStore.getState().loadDraft(IN_CHANGES)
        renderWithQuery(<ProgressIndicator />)

        fireEvent.click(screen.getByRole('button', { name: 'Exit' }))

        expect(screen.getByText('Stop changing your answers?')).toBeTruthy()
        expect(screen.queryByRole('button', { name: /delete this draft/i })).toBeNull()
    })
})
