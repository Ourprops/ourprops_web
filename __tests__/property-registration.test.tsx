import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import Details from '../app/(app)/properties/new/_components/details'
import Location from '../app/(app)/properties/new/_components/location'
import NewPropertyFlow from '../app/(app)/properties/new/_components/new-property-flow'
import { useHandleSaveDraft } from '../lib/queries/property'
import type { SavedDraft } from '../lib/validators/property'
import { useNewPropertyStore } from '../stores/new-property-store'

const DRAFT_ID = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const SAVED_AT = '2026-10-13T12:00:00.000Z'

// Stands in for the draft API: returns whatever was sent, with an id and save time
const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string)
    return {
        ok: true,
        status: init.method === 'POST' ? 201 : 200,
        json: async () => ({ id: DRAFT_ID, updatedAt: SAVED_AT, ...body }),
    }
})

function renderWithQuery(ui: ReactNode) {
    return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
}

function requests() {
    return fetchMock.mock.calls.map(([url, init]) => ({
        url,
        method: init.method,
        body: JSON.parse(init.body as string),
    }))
}

// Lets the autosave timer run out and the save finish
async function waitForAutosave() {
    await act(() => vi.advanceTimersByTimeAsync(1000))
}

function typeInto(label: string | RegExp, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

// The error messages shown under fields, in the order they appear
function errorMessages() {
    return screen.queryAllByRole('alert').map((element) => element.textContent)
}

function continueButton() {
    return screen.getByRole('button', { name: /continue/i })
}

beforeEach(() => {
    // shouldAdvanceTime keeps waitFor working while the autosave timer is faked
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockClear()
    window.history.replaceState(null, '', '/properties/new')
    useNewPropertyStore.getState().reset()
})

afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('Details screen', () => {
    test('shows errors for a missing name and type and stays on the screen', () => {
        useNewPropertyStore.getState().setScreen('details')
        renderWithQuery(<Details />)

        fireEvent.click(continueButton())

        expect(screen.getByText('Property name is required')).toBeDefined()
        expect(screen.getByText('Choose a property type')).toBeDefined()
        expect(document.activeElement).toBe(screen.getByLabelText('Property name'))
        expect(useNewPropertyStore.getState().screen).toBe('details')
    })

    test('treats a name of only spaces as missing', () => {
        renderWithQuery(<Details />)

        typeInto('Property name', '   ')
        fireEvent.click(continueButton())

        expect(screen.getByText('Property name is required')).toBeDefined()
    })

    test('clears an error as soon as the field is fixed', () => {
        renderWithQuery(<Details />)

        fireEvent.click(continueButton())
        typeInto('Property name', 'East Legon house')

        expect(screen.queryByText('Property name is required')).toBeNull()
    })

    test('stores the trimmed values and moves on to the location step', () => {
        useNewPropertyStore.getState().setScreen('details')
        renderWithQuery(<Details />)

        typeInto('Property name', '  East Legon house  ')
        fireEvent.click(screen.getByRole('radio', { name: /residential/i }))
        typeInto(/description/i, '  Four bedrooms  ')
        fireEvent.click(continueButton())

        const state = useNewPropertyStore.getState()
        expect(state.details).toEqual({ name: 'East Legon house', type: 'residential', description: 'Four bedrooms' })
        expect(state.screen).toBe('location')
    })

    test('shows what was entered earlier', () => {
        useNewPropertyStore.getState().updateDetails({ name: 'East Legon house', type: 'land' })
        renderWithQuery(<Details />)

        expect((screen.getByLabelText('Property name') as HTMLInputElement).value).toBe('East Legon house')
        expect(screen.getByRole('radio', { name: /land/i }).getAttribute('aria-checked')).toBe('true')
    })
})

describe('Location screen', () => {
    test('shows errors for the required fields', () => {
        renderWithQuery(<Location />)

        fireEvent.click(continueButton())

        expect(errorMessages()).toEqual(['Choose a region', 'Municipality is required', 'City is required'])
        expect(document.activeElement).toBe(screen.getByLabelText('Region'))
    })

    test('rejects a badly formatted digital address', () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Ashanti', municipality: 'KMA', city: 'Kumasi' })
        renderWithQuery(<Location />)

        typeInto(/digital address/i, 'GA-12')
        fireEvent.click(continueButton())

        expect(screen.getByText('Digital address must be in the format XX-000-0000')).toBeDefined()
        expect(document.activeElement).toBe(screen.getByLabelText(/digital address/i))
    })

    test('stores the location, uppercasing the digital address, and moves on to the map', () => {
        useNewPropertyStore.getState().setScreen('location')
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra' })
        renderWithQuery(<Location />)

        typeInto('Municipality or district', ' Ayawaso West ')
        typeInto('City or town', 'East Legon')
        typeInto(/^address/i, '12 Lagos Avenue')
        typeInto(/digital address/i, 'ga-123-4567')
        typeInto(/landmark/i, '')
        fireEvent.click(continueButton())

        const state = useNewPropertyStore.getState()
        expect(state.location).toEqual({
            region: 'Greater Accra',
            municipality: 'Ayawaso West',
            city: 'East Legon',
            address: '12 Lagos Avenue',
            digital_address: 'GA-123-4567',
            landmark: '',
        })
        expect(state.screen).toBe('map')
    })

    test('lets the user pick a region', async () => {
        renderWithQuery(<Location />)

        fireEvent.click(screen.getByLabelText('Region'))
        const option = await screen.findByRole('option', { name: 'Ashanti' })
        // Base UI only accepts a mouse click that started on the option, as a real click does
        fireEvent.pointerDown(option, { pointerType: 'mouse' })
        fireEvent.click(option)

        expect(useNewPropertyStore.getState().location.region).toBe('Ashanti')
    })
})

describe('Autosave', () => {
    test('does not save when the screen first opens', async () => {
        useNewPropertyStore.getState().updateDetails({ name: 'Saved earlier' })
        renderWithQuery(<Details />)

        await waitForAutosave()

        expect(fetchMock).not.toHaveBeenCalled()
    })

    test('waits until the user pauses for a second, then saves once', async () => {
        renderWithQuery(<Details />)

        typeInto('Property name', 'E')
        await act(() => vi.advanceTimersByTimeAsync(500))
        typeInto('Property name', 'East')
        await act(() => vi.advanceTimersByTimeAsync(500))
        expect(fetchMock).not.toHaveBeenCalled()

        await waitForAutosave()

        expect(requests()).toEqual([{
            url: '/api/property/draft',
            method: 'POST',
            body: { details: { name: 'East' }, location: {} },
        }])
    })

    test('creates the draft once, then updates it by id and puts the id in the URL', async () => {
        renderWithQuery(<Details />)

        typeInto('Property name', 'East Legon house')
        await waitForAutosave()
        await waitFor(() => expect(useNewPropertyStore.getState().propertyId).toBe(DRAFT_ID))

        expect(window.location.search).toBe(`?draft=${DRAFT_ID}`)
        expect(useNewPropertyStore.getState().draftSavedAt).toEqual(new Date(SAVED_AT))

        fireEvent.click(screen.getByRole('radio', { name: /land/i }))
        await waitForAutosave()

        expect(requests().map(({ url, method }) => ({ url, method }))).toEqual([
            { url: '/api/property/draft', method: 'POST' },
            { url: `/api/property/draft/${DRAFT_ID}`, method: 'PATCH' },
        ])
        expect(requests()[1].body.details).toEqual({ name: 'East Legon house', type: 'land' })
    })

    test('two saves in a row create only one draft', async () => {
        useNewPropertyStore.getState().updateDetails({ name: 'House' })
        const { result } = renderHook(() => useHandleSaveDraft(), {
            wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>,
        })

        // The second save starts before the first has returned the new draft's id
        act(() => {
            result.current.mutate()
            result.current.mutate()
        })
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

        expect(requests().map(({ method }) => method)).toEqual(['POST', 'PATCH'])
    })

    test('does not save when an edit is undone', async () => {
        useNewPropertyStore.getState().updateDetails({ name: 'House' })
        renderWithQuery(<Details />)

        typeInto('Property name', 'House 2')
        typeInto('Property name', 'House')
        await waitForAutosave()

        expect(fetchMock).not.toHaveBeenCalled()
    })

    test('saves straight away when the screen closes before the timer runs out', async () => {
        const { unmount } = renderWithQuery(<Location />)

        typeInto('City or town', 'Kumasi')
        unmount()
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

        expect(requests()[0].body.location).toEqual({ city: 'Kumasi' })
    })

    test('shows "Saving…" in the store while a save is running', async () => {
        let finish: () => void = () => {}
        fetchMock.mockImplementationOnce(async (_url, init) => {
            await new Promise<void>((resolve) => (finish = resolve))
            return { ok: true, status: 201, json: async () => ({ id: DRAFT_ID, updatedAt: SAVED_AT, ...JSON.parse(init.body as string) }) }
        })
        renderWithQuery(<Details />)

        typeInto('Property name', 'House')
        await waitForAutosave()
        expect(useNewPropertyStore.getState().savingDraft).toBe(true)

        await act(async () => finish())
        await waitFor(() => expect(useNewPropertyStore.getState().savingDraft).toBe(false))
    })
})

describe('Registration flow', () => {
    test('goes from the start screen through details to location', () => {
        renderWithQuery(<NewPropertyFlow draft={null} />)

        fireEvent.click(screen.getByRole('button', { name: /get started/i }))
        expect(screen.getByRole('heading', { name: 'Tell us about the property' })).toBeDefined()

        typeInto('Property name', 'East Legon house')
        fireEvent.click(screen.getByRole('radio', { name: /residential/i }))
        fireEvent.click(continueButton())

        expect(screen.getByRole('heading', { name: 'Where is the property?' })).toBeDefined()
    })

    test('keeps what was typed when going back a step', () => {
        renderWithQuery(<NewPropertyFlow draft={null} />)

        fireEvent.click(screen.getByRole('button', { name: /get started/i }))
        typeInto('Property name', 'East Legon house')
        fireEvent.click(screen.getByRole('radio', { name: /residential/i }))
        fireEvent.click(continueButton())
        act(() => useNewPropertyStore.getState().handleBack())

        expect((screen.getByLabelText('Property name') as HTMLInputElement).value).toBe('East Legon house')
    })

    test('resumes a saved draft from the details step', () => {
        const draft: SavedDraft = {
            id: DRAFT_ID,
            updatedAt: SAVED_AT,
            details: { name: 'East Legon house', type: 'residential' },
            location: { region: 'Greater Accra', city: 'East Legon' },
        }

        renderWithQuery(<NewPropertyFlow draft={draft} />)

        const state = useNewPropertyStore.getState()
        expect(state.propertyId).toBe(DRAFT_ID)
        expect(state.location).toEqual(draft.location)
        expect((screen.getByLabelText('Property name') as HTMLInputElement).value).toBe('East Legon house')
    })

    test('starts fresh instead of continuing a draft left over from an earlier visit', () => {
        const store = useNewPropertyStore.getState()
        store.setPropertyId(DRAFT_ID)
        store.updateDetails({ name: 'Old draft' })
        store.setScreen('location')

        renderWithQuery(<NewPropertyFlow draft={null} />)

        const state = useNewPropertyStore.getState()
        expect(state.propertyId).toBeUndefined()
        expect(state.details).toEqual({})
        expect(screen.getByRole('button', { name: /get started/i })).toBeDefined()
    })
})
