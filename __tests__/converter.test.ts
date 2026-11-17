// @vitest-environment node
// the converter runs on the server, and jsdom's FormData and Blob don't go through Node's fetch as the server's do
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const auth = vi.hoisted(() => ({ getConverterIdToken: vi.fn() }))
vi.mock('../lib/admin/converter-auth', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../lib/admin/converter-auth')>()),
    getConverterIdToken: auth.getConverterIdToken,
}))

import { ConversionError, convertToPdf } from '../lib/admin/converter'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PDF = new TextEncoder().encode('%PDF-1.7\n...')
const WORD_FILE = new Uint8Array([0x50, 0x4b, 0x03, 0x04])

const fetchMock = vi.fn()

const GCP_VARS = [
    'GCP_PROJECT_NUMBER',
    'GCP_WORKLOAD_IDENTITY_POOL_ID',
    'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID',
    'GCP_SERVICE_ACCOUNT_EMAIL',
]

describe('convertToPdf', () => {
    beforeEach(() => {
        vi.stubEnv('DOCUMENT_CONVERTER_URL', 'http://converter.test')
        // The local converter by default: no workload identity settings, so no token
        for (const name of GCP_VARS) vi.stubEnv(name, '')
        auth.getConverterIdToken.mockReset().mockResolvedValue('id-token')
        vi.stubGlobal('fetch', fetchMock)
        fetchMock.mockReset().mockResolvedValue(new Response(PDF, { status: 200 }))
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    test("posts the file to Gotenberg's LibreOffice route and returns the PDF", async () => {
        expect(await convertToPdf(WORD_FILE, DOCX)).toEqual(PDF)

        const [url, init] = fetchMock.mock.calls[0]
        expect(String(url)).toBe('http://converter.test/forms/libreoffice/convert')
        expect(init.method).toBe('POST')
        expect(init.signal).toBeInstanceOf(AbortSignal)
    })

    test("names the file for its checked type, not the owner's file name", async () => {
        await convertToPdf(WORD_FILE, 'image/tiff')

        const file = (fetchMock.mock.calls[0][1].body as FormData).get('files') as File
        expect(file.name).toBe('document.tiff')
    })

    test("refuses a type it doesn't convert without calling the converter", async () => {
        await expect(convertToPdf(WORD_FILE, 'application/pdf')).rejects.toBeInstanceOf(ConversionError)
        await expect(convertToPdf(WORD_FILE, 'image/heic')).rejects.toBeInstanceOf(ConversionError)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    test('fails clearly when the converter is not configured', async () => {
        vi.stubEnv('DOCUMENT_CONVERTER_URL', '')

        await expect(convertToPdf(WORD_FILE, DOCX)).rejects.toThrow('DOCUMENT_CONVERTER_URL is not set.')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    test("fails when the converter can't be reached or times out", async () => {
        fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'))

        await expect(convertToPdf(WORD_FILE, DOCX)).rejects.toThrow("The converter couldn't be reached.")
    })

    test('fails when the converter refuses the file', async () => {
        fetchMock.mockResolvedValue(new Response('Bad Request', { status: 400 }))

        await expect(convertToPdf(WORD_FILE, DOCX)).rejects.toThrow('The converter answered 400.')
    })

    test("doesn't trust what comes back unless it is a PDF", async () => {
        fetchMock.mockResolvedValue(new Response('<html>not a pdf</html>', { status: 200 }))

        await expect(convertToPdf(WORD_FILE, DOCX)).rejects.toThrow("The converter didn't return a PDF.")
    })

    test('sends no token to the local converter', async () => {
        await convertToPdf(WORD_FILE, DOCX)

        expect(auth.getConverterIdToken).not.toHaveBeenCalled()
        expect(fetchMock.mock.calls[0][1].headers).toEqual({})
    })

    test("sends Cloud Run an ID token for the service's own URL when workload identity is set up", async () => {
        vi.stubEnv('DOCUMENT_CONVERTER_URL', 'https://document-converter-abc-ew.a.run.app/')
        for (const name of GCP_VARS) vi.stubEnv(name, 'value')

        await convertToPdf(WORD_FILE, DOCX)

        expect(auth.getConverterIdToken.mock.calls[0][1]).toBe('https://document-converter-abc-ew.a.run.app')
        expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer id-token' })
    })

    test("doesn't call the converter without a token when it can't get one", async () => {
        for (const name of GCP_VARS) vi.stubEnv(name, 'value')
        auth.getConverterIdToken.mockRejectedValue(new Error('Google STS answered 403.'))

        const error = await convertToPdf(WORD_FILE, DOCX).catch((caught: Error) => caught)
        expect(error).toBeInstanceOf(ConversionError)
        expect((error as Error).message).toBe("Couldn't get credentials for the converter.")
        expect(((error as Error).cause as Error).message).toBe('Google STS answered 403.')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    test('refuses a half-set-up deploy rather than calling without a token', async () => {
        vi.stubEnv('GCP_PROJECT_NUMBER', '123456')

        await expect(convertToPdf(WORD_FILE, DOCX)).rejects.toThrow("Couldn't get credentials for the converter.")
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
