import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import Acquisition from '../app/(app)/properties/new/_components/acquisition'
import Details from '../app/(app)/properties/new/_components/details'
import Location from '../app/(app)/properties/new/_components/location'
import NewPropertyFlow from '../app/(app)/properties/new/_components/new-property-flow'
import ProgressIndicator from '../app/(app)/properties/new/_components/progress-indicator'
import { useHandleSaveDraft } from '../lib/queries/property'
import type { SavedDraft } from '../lib/validators/property'
import { useNewPropertyStore } from '../stores/new-property-store'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Stands in for uploading a file straight to the storage bucket
const storageUpload = vi.fn<(path: string, file: File, options: unknown) => Promise<{ error: unknown }>>(async () => ({ error: null }))
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ storage: { from: () => ({ upload: storageUpload }) } }),
}))

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
        // A DELETE has no body
        body: init.body === undefined ? undefined : JSON.parse(init.body as string),
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
    storageUpload.mockClear()
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
        expect(state.screen).toBe('boundary')
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
            body: { details: { name: 'East' }, location: {}, boundary: null, acquisition: null },
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

describe('Acquisition screen', () => {
    const DOCUMENT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
    const DOCUMENT = { id: DOCUMENT_ID, path: `${DRAFT_ID}/${DOCUMENT_ID}/letters.pdf`, file_name: 'Letters.pdf' }

    function startOnAcquisition() {
        useNewPropertyStore.setState({ screen: 'acquisition', propertyId: DRAFT_ID })
        renderWithQuery(<Acquisition />)
    }

    // The document API records the document and says where to upload it; every other call is a draft save
    function answerDocumentRequests() {
        fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
            if (url.endsWith('/documents')) return { ok: true, status: 201, json: async () => DOCUMENT } as never
            if (url.includes('/documents/')) return { ok: true, status: 204, json: async () => ({}) } as never
            const body = JSON.parse(init.body as string)
            return { ok: true, status: 200, json: async () => ({ id: DRAFT_ID, updatedAt: SAVED_AT, ...body }) } as never
        })
    }

    function chooseFile(name: string, type: string) {
        const input = document.querySelector('input[type="file"]') as HTMLInputElement
        fireEvent.change(input, { target: { files: [new File(['%PDF-1.4'], name, { type })] } })
    }

    test('asks how the property was acquired before moving on', () => {
        startOnAcquisition()

        fireEvent.click(continueButton())

        expect(screen.getByText('Choose how you got the property')).toBeDefined()
        expect(useNewPropertyStore.getState().screen).toBe('acquisition')
    })

    test("moves on straight away when the user isn't sure", () => {
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /not sure/i }))
        fireEvent.click(continueButton())

        expect(useNewPropertyStore.getState().acquisition).toEqual({ method: 'unsure', metadata: {} })
        expect(useNewPropertyStore.getState().screen).toBe('documents')
    })

    test('asks who transferred the property, and stores their name and number', () => {
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /from another owner/i }))
        fireEvent.click(continueButton())

        expect(errorMessages()).toEqual([
            'Enter the name of the person who transferred it',
            'Enter a valid phone number.',
            'Say whether you have the document showing the transfer',
        ])
        expect(document.activeElement).toBe(screen.getByLabelText('Their full name'))

        typeInto('Their full name', '  Kwame Mensah ')
        typeInto('Their phone number', '024 123 4567')
        fireEvent.click(screen.getByRole('radio', { name: 'No' }))
        fireEvent.click(continueButton())

        expect(useNewPropertyStore.getState().acquisition).toEqual({
            method: 'purchase_from_owner',
            metadata: { transferred_by: { name: 'Kwame Mensah', phone: '024 123 4567' }, has_document: false },
        })
        expect(useNewPropertyStore.getState().screen).toBe('documents')
    })

    test('asks for the document when the user says they have it', () => {
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /inherited/i }))
        fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
        fireEvent.click(continueButton())

        expect(errorMessages()).toEqual(["Upload the document, or choose No if you don't have it"])
    })

    test('uploads a document as soon as it is chosen and keeps a reference to it in the answer', async () => {
        answerDocumentRequests()
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /inherited/i }))
        fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
        chooseFile('Letters.pdf', 'application/pdf')

        await screen.findByText('Uploaded')
        expect(requests()[0]).toEqual({
            url: `/api/property/draft/${DRAFT_ID}/documents`,
            method: 'POST',
            body: { file_name: 'Letters.pdf', file_size_bytes: 8, mime_type: 'application/pdf' },
        })
        expect(storageUpload).toHaveBeenCalledWith(DOCUMENT.path, expect.any(File), { contentType: 'application/pdf', upsert: false })
        expect(useNewPropertyStore.getState().acquisition).toEqual({
            method: 'inheritance',
            metadata: { has_document: true, document: DOCUMENT },
        })

        // The answer with the document is saved like any other change
        await waitForAutosave()
        expect(requests().at(-1)?.body.acquisition).toEqual({ method: 'inheritance', metadata: { has_document: true, document: DOCUMENT } })
    })

    test("removes the record of a document whose file didn't upload, and says so", async () => {
        answerDocumentRequests()
        storageUpload.mockResolvedValueOnce({ error: { message: 'network' } })
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /directly from the original owner/i }))
        chooseFile('Indenture.pdf', 'application/pdf')

        expect(await screen.findByText("The file didn't upload. Check your connection and try again.")).toBeDefined()
        expect(requests().map((request) => [request.method, request.url])).toContainEqual(['DELETE', `/api/property/draft/${DRAFT_ID}/documents/${DOCUMENT_ID}`])
        expect(useNewPropertyStore.getState().acquisition).toEqual({ method: 'direct_purchase', metadata: {} })
    })

    test("refuses a file the bucket won't take without sending it", async () => {
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /directly from the original owner/i }))
        chooseFile('notes.txt', 'text/plain')

        expect(await screen.findByText(/^Upload a PDF, a Word document/)).toBeDefined()
        expect(fetchMock).not.toHaveBeenCalled()
    })

    test('removes an uploaded document', async () => {
        answerDocumentRequests()
        useNewPropertyStore.getState().setAcquisition({ method: 'direct_purchase', metadata: { document: DOCUMENT } })
        startOnAcquisition()

        fireEvent.click(screen.getByRole('button', { name: 'Remove Letters.pdf' }))

        await waitFor(() => expect(useNewPropertyStore.getState().acquisition).toEqual({ method: 'direct_purchase', metadata: {} }))
        expect(requests()[0]).toMatchObject({ method: 'DELETE', url: `/api/property/draft/${DRAFT_ID}/documents/${DOCUMENT_ID}` })
    })

    test('keeps the answers for each method when the user switches between them', () => {
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /leased/i }))
        typeInto('How long is the lease?', '99')
        fireEvent.click(screen.getByRole('radio', { name: /^other$/i }))
        fireEvent.click(screen.getByRole('radio', { name: /leased/i }))

        expect(useNewPropertyStore.getState().acquisition).toEqual({ method: 'lease_sublease', metadata: { lease_years: 99 } })
    })
})

describe('Failed saves', () => {
    test('shows that the draft could not be saved, and saves it again on retry', async () => {
        fetchMock.mockImplementationOnce(async () => ({
            ok: false,
            status: 500,
            json: async () => ({ error: { message: 'Unable to save your draft right now.' } }),
        }) as never)
        useNewPropertyStore.getState().setScreen('details')
        renderWithQuery(
            <>
                <ProgressIndicator />
                <Details />
            </>,
        )

        typeInto('Property name', 'House')
        await waitForAutosave()
        await waitFor(() => expect(useNewPropertyStore.getState().draftSaveFailed).toBe(true))

        fireEvent.click(screen.getByRole('button', { name: /retry/i }))
        await waitFor(() => expect(useNewPropertyStore.getState().draftSaveFailed).toBe(false))
        expect(requests().map((request) => request.body.details)).toEqual([{ name: 'House' }, { name: 'House' }])
        expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
    })
})

describe('Registration flow', () => {
    test('goes from the start screen through details to location', () => {
        renderWithQuery(<NewPropertyFlow draft={null} mapsApiKey="" />)

        fireEvent.click(screen.getByRole('button', { name: /get started/i }))
        expect(screen.getByRole('heading', { name: 'Tell us about the property' })).toBeDefined()

        typeInto('Property name', 'East Legon house')
        fireEvent.click(screen.getByRole('radio', { name: /residential/i }))
        fireEvent.click(continueButton())

        expect(screen.getByRole('heading', { name: 'Where is the property?' })).toBeDefined()
    })

    test('keeps what was typed when going back a step', () => {
        renderWithQuery(<NewPropertyFlow draft={null} mapsApiKey="" />)

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

        renderWithQuery(<NewPropertyFlow draft={draft} mapsApiKey="" />)

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

        renderWithQuery(<NewPropertyFlow draft={null} mapsApiKey="" />)

        const state = useNewPropertyStore.getState()
        expect(state.propertyId).toBeUndefined()
        expect(state.details).toEqual({})
        expect(screen.getByRole('button', { name: /get started/i })).toBeDefined()
    })
})
