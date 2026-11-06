// @vitest-environment node
// the converter runs on the server, and jsdom's FormData and Blob don't go through Node's fetch as the server's do
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ConversionError, convertToPdf } from '../lib/admin/converter'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PDF = new TextEncoder().encode('%PDF-1.7\n...')
const WORD_FILE = new Uint8Array([0x50, 0x4b, 0x03, 0x04])

const fetchMock = vi.fn()

describe('convertToPdf', () => {
    beforeEach(() => {
        vi.stubEnv('DOCUMENT_CONVERTER_URL', 'http://converter.test')
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
})
