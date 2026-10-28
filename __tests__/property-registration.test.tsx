import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import Acquisition from '../app/account/dashboard/properties/new/_components/acquisition'
import Boundary from '../app/account/dashboard/properties/new/_components/boundary'
import Confirmation from '../app/account/dashboard/properties/new/_components/confirmation'
import Details from '../app/account/dashboard/properties/new/_components/details'
import Documents from '../app/account/dashboard/properties/new/_components/documents'
import Location from '../app/account/dashboard/properties/new/_components/location'
import NewPropertyFlow from '../app/account/dashboard/properties/new/_components/new-property-flow'
import ProgressIndicator from '../app/account/dashboard/properties/new/_components/progress-indicator'
import Review from '../app/account/dashboard/properties/new/_components/review'
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
        method: init?.method ?? 'GET',
        // A GET or DELETE has no body
        body: init?.body === undefined ? undefined : JSON.parse(init.body as string),
    }))
}

// Lets the autosave timer run out and the save finish
async function waitForAutosave() {
    await act(() => vi.advanceTimersByTimeAsync(1000))
}

function typeInto(label: string | RegExp, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

// Base UI only accepts a mouse click that started on the option, as a real click does
async function clickOption(name: string) {
    const option = await screen.findByRole('option', { name })
    fireEvent.pointerDown(option, { pointerType: 'mouse' })
    fireEvent.click(option)
}

// Opens a select by its label and picks an option
async function pickOption(label: string, name: string) {
    fireEvent.click(screen.getByLabelText(label))
    await clickOption(name)
}

// Types into a combobox to filter its options. jsdom's change event doesn't open the list, so ArrowDown does, as a keyboard user would
function searchCombobox(label: string, query: string) {
    typeInto(label, query)
    fireEvent.keyDown(screen.getByLabelText(label), { key: 'ArrowDown' })
}

async function searchAndPick(label: string, query: string, name: string) {
    searchCombobox(label, query)
    await clickOption(name)
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
    window.history.replaceState(null, '', '/account/dashboard/properties/new')
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

        expect(errorMessages()).toEqual(['Choose a region', 'Choose a municipality or district', 'City is required'])
        expect(document.activeElement).toBe(screen.getByLabelText('Region'))
    })

    test('rejects a badly formatted digital address', () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Ashanti', municipality: 'Kumasi', city: 'Kumasi' })
        renderWithQuery(<Location />)

        typeInto(/digital address \(optional\)/i, 'AK-12')
        fireEvent.click(continueButton())

        expect(screen.getByText('Enter the digital address like GA-183-4290 or GA-0183-4290')).toBeDefined()
        expect(document.activeElement).toBe(screen.getByLabelText(/digital address \(optional\)/i))
    })

    test('adds the dashes to the digital address as the user types', () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra' })
        renderWithQuery(<Location />)

        typeInto(/digital address \(optional\)/i, 'ga1834290')

        expect(useNewPropertyStore.getState().location.digital_address).toBe('GA-183-4290')
    })

    test("prefills the region's letter, takes the district letter, then moves on to the numbers", () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra' })
        renderWithQuery(<Location />)
        const letters = screen.getByLabelText(/digital address \(optional\)/i)

        fireEvent.focus(letters)
        expect(useNewPropertyStore.getState().location.digital_address).toBe('G')

        // The prefilled G is selected, so typing replaces it; a lone district letter keeps the G in front
        typeInto(/digital address \(optional\)/i, 'A')

        expect(useNewPropertyStore.getState().location.digital_address).toBe('GA')
        expect(document.activeElement).toBe(screen.getByLabelText('Digital address numbers'))
    })

    test('opens the number keypad for the numbers and adds the dashes', () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra', digital_address: 'GA' })
        renderWithQuery(<Location />)
        const numbers = screen.getByLabelText('Digital address numbers') as HTMLInputElement

        typeInto('Digital address numbers', '01834290')

        expect(numbers.inputMode).toBe('numeric')
        expect(numbers.value).toBe('0183-4290')
        expect(useNewPropertyStore.getState().location.digital_address).toBe('GA-0183-4290')
    })

    test('fills both boxes when a whole address is pasted into the numbers', () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra' })
        renderWithQuery(<Location />)

        typeInto('Digital address numbers', 'GA 183 4290')

        expect((screen.getByLabelText(/digital address \(optional\)/i) as HTMLInputElement).value).toBe('GA')
        expect((screen.getByLabelText('Digital address numbers') as HTMLInputElement).value).toBe('183-4290')
    })

    test('goes back to the letters on Backspace at the start of the numbers', () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra', digital_address: 'GA' })
        renderWithQuery(<Location />)
        const numbers = screen.getByLabelText('Digital address numbers') as HTMLInputElement

        numbers.focus()
        fireEvent.keyDown(numbers, { key: 'Backspace' })

        expect(document.activeElement).toBe(screen.getByLabelText(/digital address \(optional\)/i))
    })

    test('clears the prefilled letter when the user leaves without typing, so the optional field stays empty', () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra' })
        renderWithQuery(<Location />)
        const letters = screen.getByLabelText(/digital address \(optional\)/i)

        fireEvent.focus(letters)
        fireEvent.blur(letters, { relatedTarget: screen.getByLabelText('City or town') })

        expect(useNewPropertyStore.getState().location.digital_address).toBe('')
    })

    test("rejects a digital address that doesn't start with the region's letter", () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Ashanti', municipality: 'Kumasi', city: 'Kumasi' })
        renderWithQuery(<Location />)

        // Pasted with Greater Accra's G, which the field leaves as is rather than silently changing
        typeInto(/digital address \(optional\)/i, 'GA-183-4290')
        fireEvent.click(continueButton())

        expect(errorMessages()).toEqual(['Digital addresses in Ashanti start with A'])
        expect(document.activeElement).toBe(screen.getByLabelText(/digital address \(optional\)/i))
    })

    test('stores the location, uppercasing the digital address, and moves on to the map', async () => {
        useNewPropertyStore.getState().setScreen('location')
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra' })
        renderWithQuery(<Location />)

        await searchAndPick('Municipality or district', 'ayawaso w', 'Ayawaso West Municipal')
        typeInto('City or town', 'East Legon')
        typeInto(/^address/i, '12 Lagos Avenue')
        typeInto(/digital address \(optional\)/i, 'ga-123-4567')
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

    test('goes back to the property details', () => {
        useNewPropertyStore.getState().setScreen('location')
        renderWithQuery(<Location />)

        fireEvent.click(screen.getByRole('button', { name: 'Back' }))

        expect(useNewPropertyStore.getState().screen).toBe('details')
    })

    test('lets the user pick a region', async () => {
        renderWithQuery(<Location />)

        await pickOption('Region', 'Ashanti')

        expect(useNewPropertyStore.getState().location.region).toBe('Ashanti')
    })

    test('keeps the municipality search disabled until a region is chosen', () => {
        renderWithQuery(<Location />)

        expect((screen.getByLabelText('Municipality or district') as HTMLInputElement).disabled).toBe(true)
    })

    test('filters the municipalities and districts by what the user types', async () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Ashanti' })
        renderWithQuery(<Location />)

        searchCombobox('Municipality or district', 'sekyere')

        await screen.findByRole('option', { name: 'Sekyere East District' })
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
            'Sekyere Afram Plains District',
            'Sekyere Central District',
            'Sekyere East District',
            'Sekyere Kumawu District',
            'Sekyere South District',
        ])
    })

    test("only searches the chosen region's municipalities and districts", async () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra' })
        renderWithQuery(<Location />)

        // Kumasi is in Ashanti
        searchCombobox('Municipality or district', 'Kumasi')

        expect(await screen.findByText('No municipality or district by that name in Greater Accra')).toBeDefined()
        expect(screen.queryAllByRole('option')).toHaveLength(0)
    })

    test('clears the municipality when the region changes', async () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra', municipality: 'Ayawaso West' })
        renderWithQuery(<Location />)

        await pickOption('Region', 'Ashanti')

        // "" rather than undefined, so the autosaved draft clears the column too
        expect(useNewPropertyStore.getState().location.municipality).toBe('')
    })

    test('keeps the municipality when the same region is picked again', async () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Greater Accra', municipality: 'Ayawaso West' })
        renderWithQuery(<Location />)

        await pickOption('Region', 'Greater Accra')

        expect(useNewPropertyStore.getState().location.municipality).toBe('Ayawaso West')
    })

    test('rejects a municipality from another region, such as one left in a saved draft', () => {
        useNewPropertyStore.getState().updateLocation({ region: 'Ashanti', municipality: 'Ayawaso West', city: 'Kumasi' })
        renderWithQuery(<Location />)

        fireEvent.click(continueButton())

        expect(errorMessages()).toEqual(['Choose a municipality or district in this region'])
        expect(useNewPropertyStore.getState().screen).not.toBe('boundary')
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
            body: { slot: 'ownership', file_name: 'Letters.pdf', file_size_bytes: 8, mime_type: 'application/pdf' },
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

    test.each([
        { answer: /leased/i, question: 'How long is the lease?', next: /inherited/i },
        { answer: /^other$/i, question: 'Tell us how you got the property', next: /not sure/i },
    ])("shows the questions for $question right under the chosen answer, before the next one", ({ answer, question, next }) => {
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: answer }))

        const field = screen.getByLabelText(question)
        const follows = (earlier: Element, later: Element) => !!(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING)
        expect(follows(screen.getByRole('radio', { name: answer }), field)).toBe(true)
        expect(follows(field, screen.getByRole('radio', { name: next }))).toBe(true)
    })

    test('goes back to the map', () => {
        startOnAcquisition()

        fireEvent.click(screen.getByRole('button', { name: 'Back' }))

        expect(useNewPropertyStore.getState().screen).toBe('boundary')
    })

    test('holds Back while a document uploads, so the upload is not lost', async () => {
        answerDocumentRequests()
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /inherited/i }))
        fireEvent.click(screen.getByRole('radio', { name: 'Yes' }))
        chooseFile('Letters.pdf', 'application/pdf')

        expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(true)
        await screen.findByText('Uploaded')
        expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(false)
    })

    test('asks for the note and stores it when Other is chosen', () => {
        startOnAcquisition()

        fireEvent.click(screen.getByRole('radio', { name: /^other$/i }))
        typeInto('Tell us how you got the property', 'A gift from my uncle')
        fireEvent.click(continueButton())

        expect(useNewPropertyStore.getState().acquisition).toEqual({ method: 'other', metadata: { note: 'A gift from my uncle' } })
        expect(useNewPropertyStore.getState().screen).toBe('documents')
    })
})

describe('Documents screen', () => {
    const IDS = ['9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d', '7e6d5c4b-3a29-4180-9f7e-6d5c4b3a2918']

    function listed(index: number, overrides: Record<string, unknown> = {}) {
        return {
            id: IDS[index],
            path: `${DRAFT_ID}/${IDS[index]}/file-${index}.pdf`,
            file_name: `File ${index}.pdf`,
            slot: 'ownership',
            declared_type: null,
            file_size_bytes: 250_000,
            mime_type: 'application/pdf',
            created_at: SAVED_AT,
            ...overrides,
        }
    }

    // Stands in for the document API: lists `documents`, records uploads with the next free id and accepts changes
    function answerDocumentRequests(documents: unknown[], { failTypeChange = false } = {}) {
        let uploaded = documents.length
        // A GET is sent without options, despite what the type says
        fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
            const method = init?.method ?? 'GET'
            if (url.endsWith('/documents') && method === 'GET') return { ok: true, status: 200, json: async () => documents } as never
            if (url.endsWith('/documents')) {
                const body = JSON.parse(init.body as string)
                const id = IDS[uploaded++]
                return { ok: true, status: 201, json: async () => ({ id, path: `${DRAFT_ID}/${id}/${body.file_name}`, file_name: body.file_name }) } as never
            }
            if (method === 'PATCH' && url.includes('/documents/')) {
                if (failTypeChange) return { ok: false, status: 500, json: async () => ({ error: { message: 'Unable to save what this document is right now.' } }) } as never
                const body = JSON.parse(init.body as string)
                return { ok: true, status: 200, json: async () => ({ ...listed(0), ...body }) } as never
            }
            if (method === 'DELETE') return { ok: true, status: 204, json: async () => ({}) } as never
            const body = JSON.parse(init.body as string)
            return { ok: true, status: 200, json: async () => ({ id: DRAFT_ID, updatedAt: SAVED_AT, ...body }) } as never
        })
    }

    function startOnDocuments() {
        useNewPropertyStore.setState({ screen: 'documents', propertyId: DRAFT_ID })
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Documents />
            </QueryClientProvider>,
        )
    }

    function checklistItem(title: string) {
        return within(screen.getByRole('listitem', { name: new RegExp(`^${title}`) }))
    }

    function chooseFiles(item: ReturnType<typeof checklistItem>, names: string[]) {
        const input = item.getByRole('button', { name: /add a file|add another file/i }).parentElement!.querySelector('input[type="file"]')!
        fireEvent.change(input, { target: { files: names.map((name) => new File(['%PDF-1.4'], name, { type: 'application/pdf' })) } })
    }

    async function chooseType(fileName: string, type: string) {
        fireEvent.click(screen.getByLabelText(`What is it? (${fileName})`))
        const option = await screen.findByRole('option', { name: type })
        // Base UI only accepts a mouse click that started on the option, as a real click does
        fireEvent.pointerDown(option, { pointerType: 'mouse' })
        fireEvent.click(option)
    }

    test('shows the three checklist items, with the documents already uploaded under each', async () => {
        answerDocumentRequests([listed(0), listed(1, { slot: 'site_plan', file_name: 'Plan.pdf', declared_type: 'cadastral_plan' })])
        startOnDocuments()

        expect(await checklistItem('Ownership document').findByText('File 0.pdf')).toBeDefined()
        expect(checklistItem('Site plan or survey plan').getByText('Plan.pdf')).toBeDefined()
        expect(checklistItem('Other supporting documents').queryAllByRole('listitem')).toEqual([])
        expect(screen.getByLabelText('What is it? (File 0.pdf)').textContent).toContain("I'm not sure")
        expect(screen.getByLabelText('What is it? (Plan.pdf)').textContent).toContain('Cadastral plan')
        expect(screen.getByRole('heading', { name: 'Site plan or survey plan (added)' })).toBeDefined()
        expect(screen.getByRole('heading', { name: 'Other supporting documents (not added yet)' })).toBeDefined()
    })

    test('uploads several files to a checklist item at once', async () => {
        answerDocumentRequests([])
        startOnDocuments()
        await screen.findByRole('button', { name: /continue without documents/i })

        chooseFiles(checklistItem('Site plan or survey plan'), ['Plan.pdf', 'Survey.pdf'])

        expect(screen.getByRole('button', { name: 'Uploading…' }).hasAttribute('disabled')).toBe(true)
        // Back waits too, as leaving would drop the uploads in progress and any errors they end with
        expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(true)
        await waitFor(() => expect(checklistItem('Site plan or survey plan').getAllByText(/^(Plan|Survey)\.pdf$/)).toHaveLength(2))
        expect(screen.queryByText('Uploading…')).toBeNull()
        expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(false)
        const uploads = requests().filter((request) => request.method === 'POST')
        expect(uploads.map((request) => request.body)).toEqual([
            { slot: 'site_plan', file_name: 'Plan.pdf', file_size_bytes: 8, mime_type: 'application/pdf' },
            { slot: 'site_plan', file_name: 'Survey.pdf', file_size_bytes: 8, mime_type: 'application/pdf' },
        ])
        expect(storageUpload).toHaveBeenCalledTimes(2)
    })

    test("shows a file that didn't upload under its checklist item, and lets the user dismiss it", async () => {
        answerDocumentRequests([])
        storageUpload.mockResolvedValueOnce({ error: { message: 'network' } })
        startOnDocuments()
        await screen.findByRole('button', { name: /continue without documents/i })

        chooseFiles(checklistItem('Ownership document'), ['Indenture.pdf'])

        expect(await checklistItem('Ownership document').findByText("The file didn't upload. Check your connection and try again.")).toBeDefined()
        expect(continueButton().hasAttribute('disabled')).toBe(false)
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss Indenture.pdf' }))
        expect(screen.queryByText('Indenture.pdf')).toBeNull()
    })

    test('lets the user say what a document is, or that they are not sure', async () => {
        answerDocumentRequests([listed(0)])
        startOnDocuments()
        await screen.findByText('File 0.pdf')

        await chooseType('File 0.pdf', 'Indenture')

        await waitFor(() => expect(screen.getByLabelText('What is it? (File 0.pdf)').textContent).toContain('Indenture'))
        expect(requests().at(-1)).toEqual({ url: `/api/property/draft/${DRAFT_ID}/documents/${IDS[0]}`, method: 'PATCH', body: { declared_type: 'indenture' } })

        await chooseType('File 0.pdf', "I'm not sure")

        await waitFor(() => expect(requests().at(-1)?.body).toEqual({ declared_type: null }))
    })

    test("puts the answer back when it can't be saved", async () => {
        answerDocumentRequests([listed(0)], { failTypeChange: true })
        startOnDocuments()
        await screen.findByText('File 0.pdf')

        await chooseType('File 0.pdf', 'Site plan')

        expect(await screen.findByText('Unable to save what this document is right now.')).toBeDefined()
        expect(screen.getByLabelText('What is it? (File 0.pdf)').textContent).toContain("I'm not sure")
    })

    test('removes a document, and drops it from the acquisition answer that pointed to it', async () => {
        const document = listed(0)
        answerDocumentRequests([document])
        useNewPropertyStore.getState().setAcquisition({
            method: 'direct_purchase',
            metadata: { document: { id: document.id, path: document.path, file_name: document.file_name } },
        })
        startOnDocuments()

        expect(await screen.findByText(/Added with your answer on how you got the property/)).toBeDefined()
        fireEvent.click(screen.getByRole('button', { name: 'Remove File 0.pdf' }))

        await waitFor(() => expect(screen.queryByText('File 0.pdf')).toBeNull())
        expect(useNewPropertyStore.getState().acquisition).toEqual({ method: 'direct_purchase', metadata: {} })
        await waitForAutosave()
        expect(requests().at(-1)).toMatchObject({ method: 'PATCH', url: `/api/property/draft/${DRAFT_ID}`, body: { acquisition: { method: 'direct_purchase', metadata: {} } } })
    })

    test('lets the user continue without documents', async () => {
        answerDocumentRequests([])
        startOnDocuments()

        fireEvent.click(await screen.findByRole('button', { name: /continue without documents/i }))

        expect(useNewPropertyStore.getState().screen).toBe('review')
    })

    test('goes back to how the user got the property', async () => {
        answerDocumentRequests([])
        startOnDocuments()

        fireEvent.click(await screen.findByRole('button', { name: 'Back' }))

        expect(useNewPropertyStore.getState().screen).toBe('acquisition')
    })

    // The map screen offers the same site plan item, so it shares this block's stand-in document API
    describe('site plan on the map screen', () => {
        function startOnBoundary() {
            useNewPropertyStore.setState({ screen: 'boundary', propertyId: DRAFT_ID })
            render(
                <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                    {/* No key shows the map-unavailable message, so the screen renders without Google Maps */}
                    <Boundary mapsApiKey="" />
                </QueryClientProvider>,
            )
        }

        const sitePlanItem = () => checklistItem('Have a site plan\\? Upload it \\(optional\\)')

        test('asks for a site plan where the GeoJSON upload used to be', async () => {
            answerDocumentRequests([])
            startOnBoundary()

            expect(await sitePlanItem().findByRole('button', { name: 'Add a file' })).toBeDefined()
            expect(screen.queryByText(/geojson/i)).toBeNull()
        })

        test('uploads the plan to the site plan slot, so it also shows on the documents screen', async () => {
            answerDocumentRequests([])
            startOnBoundary()
            await sitePlanItem().findByRole('button', { name: 'Add a file' })

            chooseFiles(sitePlanItem(), ['Plan.pdf'])

            expect(await sitePlanItem().findByText('Plan.pdf')).toBeDefined()
            const upload = requests().find((request) => request.method === 'POST')
            expect(upload).toMatchObject({ url: `/api/property/draft/${DRAFT_ID}/documents`, body: { slot: 'site_plan', file_name: 'Plan.pdf' } })
            expect(storageUpload).toHaveBeenCalledOnce()
        })

        test('shows a plan uploaded earlier, from either screen', async () => {
            answerDocumentRequests([listed(0, { slot: 'site_plan', file_name: 'Plan.pdf' }), listed(1)])
            startOnBoundary()

            expect(await sitePlanItem().findByText('Plan.pdf')).toBeDefined()
            // Only site plans: the ownership document stays on the documents screen
            expect(screen.queryByText('File 1.pdf')).toBeNull()
        })

        test('holds Continue, Skip and Back while the plan is uploading', async () => {
            answerDocumentRequests([])
            startOnBoundary()
            await sitePlanItem().findByRole('button', { name: 'Add a file' })

            chooseFiles(sitePlanItem(), ['Plan.pdf'])

            expect(screen.getByRole('button', { name: 'Uploading…' }).hasAttribute('disabled')).toBe(true)
            expect(screen.getByRole('button', { name: 'Skip for now' }).hasAttribute('disabled')).toBe(true)
            expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(true)
            await sitePlanItem().findByText('Plan.pdf')
            expect(screen.getByRole('button', { name: /continue/i }).hasAttribute('disabled')).toBe(false)
            expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(false)
        })

        test('goes back to the location', async () => {
            answerDocumentRequests([])
            startOnBoundary()

            fireEvent.click(await screen.findByRole('button', { name: 'Back' }))

            expect(useNewPropertyStore.getState().screen).toBe('location')
        })
    })
})

describe('Review screen', () => {
    const DOCUMENT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
    const INDENTURE = {
        id: DOCUMENT_ID,
        path: `${DRAFT_ID}/${DOCUMENT_ID}/indenture.pdf`,
        file_name: 'Indenture.pdf',
        slot: 'ownership',
        declared_type: 'indenture',
        file_size_bytes: 250_000,
        mime_type: 'application/pdf',
        created_at: SAVED_AT,
    }

    // A draft with every screen answered, apart from what each test leaves out
    function fillDraft() {
        useNewPropertyStore.setState({
            screen: 'review',
            propertyId: DRAFT_ID,
            details: { name: 'East Legon house', type: 'residential' },
            location: { region: 'Greater Accra', municipality: 'Ayawaso West', city: 'East Legon', digital_address: 'GA-123-4567' },
            boundary: {
                polygon: [
                    { latitude: 5.6, longitude: -0.2 },
                    { latitude: 5.6, longitude: -0.199 },
                    { latitude: 5.601, longitude: -0.199 },
                ],
                source: 'manual_draw',
            },
            acquisition: { method: 'unsure', metadata: {} },
        })
    }

    // Stands in for the API: lists `documents` and answers a submit with `submitResponse`
    function answerRequests(documents: unknown[], submitResponse = { ok: true, status: 200, body: { slug: 'east-legon-house-3f1c2b4a' } as unknown }) {
        fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
            if (url.endsWith('/documents')) return { ok: true, status: 200, json: async () => documents } as never
            if (url.endsWith('/submit')) return { ...submitResponse, json: async () => submitResponse.body } as never
            const body = JSON.parse(init.body as string)
            return { ok: true, status: 200, json: async () => ({ id: DRAFT_ID, updatedAt: SAVED_AT, ...body }) } as never
        })
    }

    // The whole flow, so the edit links can open other screens. The draft matches the store, so the flow keeps it as it is.
    function renderReview() {
        const { details, location } = useNewPropertyStore.getState()
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <NewPropertyFlow draft={{ id: DRAFT_ID, updatedAt: SAVED_AT, details, location }} mapsApiKey="" />
            </QueryClientProvider>,
        )
    }

    function reviewSection(title: string) {
        return within(screen.getByRole('region', { name: title }))
    }

    test('shows every answer, grouped by the screen it came from', async () => {
        fillDraft()
        answerRequests([INDENTURE])
        render(<QueryClientProvider client={new QueryClient()}><Review /></QueryClientProvider>)

        expect(await reviewSection('Documents').findByText('Indenture.pdf')).toBeDefined()
        expect(reviewSection('Documents').getByText('Indenture')).toBeDefined()
        expect(reviewSection('Property details').getByText('East Legon house')).toBeDefined()
        expect(reviewSection('Property details').getByText('Residential')).toBeDefined()
        expect(reviewSection('Location').getByText('GA-123-4567')).toBeDefined()
        expect(reviewSection('Location').getAllByText('Not given')).toHaveLength(2)
        expect(reviewSection('Boundary').getByText(/m² \(/)).toBeDefined()
        expect(reviewSection('How you got it').getByText(/You're not sure/)).toBeDefined()
    })

    test("says clearly what's missing, and still lets the user submit", async () => {
        fillDraft()
        useNewPropertyStore.setState({ boundary: null })
        answerRequests([INDENTURE])
        renderReview()

        expect(await screen.findByRole('heading', { name: '3 things are missing' })).toBeDefined()
        expect(screen.getByRole('button', { name: 'No boundary or pin on the map yet' })).toBeDefined()
        expect(screen.getByRole('button', { name: 'No site plan or survey plan yet' })).toBeDefined()
        expect(screen.getByRole('button', { name: 'No other supporting documents yet' })).toBeDefined()
        expect(reviewSection('Boundary').getByText('No boundary or pin yet')).toBeDefined()
        expect(screen.getByRole('button', { name: /submit for review/i }).hasAttribute('disabled')).toBe(false)
    })

    test("points out a document the user said they have but didn't upload", async () => {
        fillDraft()
        useNewPropertyStore.setState({ acquisition: { method: 'inheritance', metadata: { has_document: true } } })
        answerRequests([INDENTURE])
        renderReview()

        expect(await screen.findByRole('button', { name: /said you have a document/ })).toBeDefined()
        expect(reviewSection('How you got it').getByText('Not uploaded yet')).toBeDefined()
    })

    test('opens a section to edit it, and comes back to review when the user continues', async () => {
        fillDraft()
        answerRequests([INDENTURE])
        renderReview()

        fireEvent.click(screen.getByRole('button', { name: 'Edit property details' }))
        expect(screen.getByRole('heading', { name: 'Tell us about the property' })).toBeDefined()
        typeInto('Property name', 'East Legon villa')
        fireEvent.click(continueButton())

        expect(screen.getByRole('heading', { name: 'Check your answers' })).toBeDefined()
        expect(reviewSection('Property details').getByText('East Legon villa')).toBeDefined()
    })

    test('opens the screen for something missing, and comes back to review when the user goes back', async () => {
        fillDraft()
        answerRequests([INDENTURE])
        renderReview()

        fireEvent.click(await screen.findByRole('button', { name: 'No site plan or survey plan yet' }))
        expect(screen.getByRole('heading', { name: 'Add your documents' })).toBeDefined()
        act(() => useNewPropertyStore.getState().handleBack())

        expect(screen.getByRole('heading', { name: 'Check your answers' })).toBeDefined()
    })

    test('asks the user to confirm their information is accurate before submitting', async () => {
        fillDraft()
        answerRequests([INDENTURE])
        render(<QueryClientProvider client={new QueryClient()}><Review /></QueryClientProvider>)

        expect(screen.getByText('I confirm that the information I have provided is accurate to the best of my knowledge.')).toBeDefined()
        fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))

        expect(errorMessages()).toEqual(['Tick the box to confirm your information is accurate'])
        expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'I confirm' }))
        expect(requests().some((request) => request.url.endsWith('/submit'))).toBe(false)
    })

    test('submits the draft once the user confirms, and moves on to the confirmation', async () => {
        fillDraft()
        answerRequests([INDENTURE])
        render(<QueryClientProvider client={new QueryClient()}><Review /></QueryClientProvider>)

        fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm' }))
        fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))

        await waitFor(() => expect(useNewPropertyStore.getState().screen).toBe('confirmation'))
        expect(requests()).toContainEqual({ url: `/api/property/draft/${DRAFT_ID}/submit`, method: 'POST', body: { confirmed: true } })
    })

    test('covers the screen while submitting, and uncovers it if the submit fails', async () => {
        fillDraft()
        answerRequests([INDENTURE])
        // Holds the submit open until the test answers it
        let answerSubmit: (response: unknown) => void = () => {}
        const answerOthers = fetchMock.getMockImplementation()!
        fetchMock.mockImplementation((url: string, init: RequestInit) =>
            url.endsWith('/submit') ? new Promise((resolve) => (answerSubmit = resolve)) as never : answerOthers(url, init),
        )
        render(<QueryClientProvider client={new QueryClient()}><Review /></QueryClientProvider>)

        fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm' }))
        fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))

        expect(await screen.findByText('Submitting your property…')).toBeDefined()

        answerSubmit({ ok: false, status: 500, json: async () => ({ error: { message: 'Unable to submit your property right now.' } }) })

        expect(await screen.findByText('Unable to submit your property right now.')).toBeDefined()
        expect(screen.queryByText('Submitting your property…')).toBeNull()
    })

    test("says why when the submit doesn't go through, and stays on review", async () => {
        fillDraft()
        answerRequests([INDENTURE], { ok: false, status: 500, body: { error: { message: 'Unable to submit your property right now.' } } })
        render(<QueryClientProvider client={new QueryClient()}><Review /></QueryClientProvider>)

        fireEvent.click(screen.getByRole('checkbox', { name: 'I confirm' }))
        fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))

        expect(await screen.findByText('Unable to submit your property right now.')).toBeDefined()
        expect(useNewPropertyStore.getState().screen).toBe('review')
    })

    test("waits for an answer the property can't be submitted without", () => {
        fillDraft()
        useNewPropertyStore.setState({ acquisition: null })
        answerRequests([INDENTURE])
        render(<QueryClientProvider client={new QueryClient()}><Review /></QueryClientProvider>)

        expect(screen.getByText('Add how you got the property before you submit.')).toBeDefined()
        expect(screen.getByRole('button', { name: /submit for review/i }).hasAttribute('disabled')).toBe(true)
    })
})

describe('Confirmation screen', () => {
    function showConfirmation(documents: unknown[]) {
        useNewPropertyStore.setState({
            screen: 'confirmation',
            propertyId: DRAFT_ID,
            details: { name: 'East Legon house', type: 'residential' },
            location: { region: 'Greater Accra', city: 'East Legon' },
            boundary: null,
            acquisition: { method: 'unsure', metadata: {} },
        })
        // Only the documents are fetched; anything else is a draft save, answered as usual
        fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
            if (url.endsWith('/documents')) return { ok: true, status: 200, json: async () => documents } as never
            const body = JSON.parse(init.body as string)
            return { ok: true, status: 200, json: async () => ({ id: DRAFT_ID, updatedAt: SAVED_AT, ...body }) } as never
        })
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Confirmation />
            </QueryClientProvider>,
        )
    }

    test('says the property was sent for review and what happens next', () => {
        showConfirmation([])

        expect(screen.getByRole('heading', { name: 'Property submitted' })).toBeDefined()
        expect(screen.getByText('East Legon house')).toBeDefined()
        expect(screen.getAllByRole('listitem').map((item) => item.querySelector('p')?.textContent)).toContain('A reviewer checks your property')
        expect(screen.getByText('Go to your dashboard').closest('a')?.getAttribute('href')).toBe('/account/dashboard')
    })

    test('lists what the user submitted without, so they can have it ready', async () => {
        showConfirmation([])

        expect(await screen.findByRole('heading', { name: 'Have these ready' })).toBeDefined()
        expect(screen.getByText('No boundary or pin on the map yet')).toBeDefined()
        expect(screen.getByText('No ownership document yet')).toBeDefined()
    })

    test('starts a new registration', () => {
        showConfirmation([])

        fireEvent.click(screen.getByRole('button', { name: 'Register another property' }))

        const state = useNewPropertyStore.getState()
        expect(state.screen).toBe('start')
        expect(state.propertyId).toBeUndefined()
        expect(state.details).toEqual({})
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
    test('cancelling on the start screen goes back to the dashboard', () => {
        renderWithQuery(<NewPropertyFlow draft={null} mapsApiKey="" />)

        expect(screen.getByText('Cancel').closest('a')?.getAttribute('href')).toBe('/account/dashboard')
    })

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
