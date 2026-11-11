// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { openPropertyDocument } from '../app/admin/properties/[id]/actions'
import { DOCUMENT_ERRORS } from '../lib/admin/document-preview'

const PROPERTY = 'aaaaaaaa-0000-4000-8000-000000000001'
const DOCUMENT = 'dddddddd-0000-4000-8000-000000000001'
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\n')
const DOCX_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new Array(26).fill(0), ...new TextEncoder().encode('[Content_Types].xml word/')])

const requireAdmin = vi.fn()
const serviceDownload = vi.fn()
const convertToPdf = vi.fn()

vi.mock('@/lib/auth/staff', () => ({ requireAdmin: () => requireAdmin() }))
vi.mock('next/cache', () => ({ refresh: vi.fn() }))
vi.mock('@/lib/supabase/service-role', () => ({
    createClient: () => ({ storage: { from: () => ({ download: serviceDownload }) } }),
}))
vi.mock('@/lib/admin/converter', () => ({ convertToPdf: (...args: unknown[]) => convertToPdf(...args) }))

// The admin's session: the document row (read again after recording), the review function, and storage
function adminSession(rows: (Record<string, unknown> | null)[]) {
    const maybeSingle = vi.fn()
    for (const row of rows) maybeSingle.mockResolvedValueOnce({ data: row, error: null })
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null })
    const createSignedUrl = vi.fn((path: string) => Promise.resolve({ data: { signedUrl: `https://signed.test/${path}` }, error: null }))
    const storageFrom = vi.fn(() => ({ upload, createSignedUrl }))
    const supabase = {
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
        rpc,
        storage: { from: storageFrom },
    }
    requireAdmin.mockResolvedValue({ supabase, adminId: 'admin' })
    return { rpc, upload, createSignedUrl, storageFrom }
}

function row(fields: Record<string, unknown>) {
    return {
        id: DOCUMENT,
        property_id: PROPERTY,
        file_path: `${PROPERTY}/${DOCUMENT}/file`,
        mime_type: 'application/pdf',
        preview_status: null,
        preview_path: null,
        ...fields,
    }
}

const stored = (bytes: Uint8Array, type: string) => ({ data: new Blob([bytes as BlobPart], { type }), error: null })

describe('openPropertyDocument', () => {
    beforeEach(() => {
        requireAdmin.mockReset()
        serviceDownload.mockReset()
        convertToPdf.mockReset().mockResolvedValue(PDF_BYTES)
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    test('checks the caller before reading anything, with either client', async () => {
        requireAdmin.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'))

        await expect(openPropertyDocument(DOCUMENT)).rejects.toThrow()
        expect(serviceDownload).not.toHaveBeenCalled()
    })

    test('refuses an id that is not a uuid', async () => {
        adminSession([])

        expect(await openPropertyDocument('../../etc')).toEqual({ error: DOCUMENT_ERRORS.notFound })
        expect(serviceDownload).not.toHaveBeenCalled()
    })

    test("never downloads a document the admin's session can't see", async () => {
        adminSession([null])

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ error: DOCUMENT_ERRORS.notFound })
        expect(serviceDownload).not.toHaveBeenCalled()
    })

    test('opens a checked document straight away, without downloading it again', async () => {
        const { createSignedUrl, storageFrom } = adminSession([row({ preview_status: 'ready' })])

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ kind: 'pdf', url: `https://signed.test/${PROPERTY}/${DOCUMENT}/file` })
        expect(storageFrom).toHaveBeenCalledWith('property-documents')
        expect(createSignedUrl).toHaveBeenCalledWith(`${PROPERTY}/${DOCUMENT}/file`, 300)
        expect(serviceDownload).not.toHaveBeenCalled()
    })

    test("opens a converted document's PDF, never its original", async () => {
        const previewPath = `${PROPERTY}/${DOCUMENT}.pdf`
        const { storageFrom } = adminSession([row({ mime_type: DOCX, preview_status: 'ready', preview_path: previewPath })])

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ kind: 'pdf', url: `https://signed.test/${previewPath}` })
        expect(storageFrom).toHaveBeenCalledWith('property-document-previews')
        expect(storageFrom).not.toHaveBeenCalledWith('property-documents')
    })

    test("doesn't open a document already found not to match its type", async () => {
        adminSession([row({ preview_status: 'type_mismatch' })])

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ error: DOCUMENT_ERRORS.mismatch })
        expect(serviceDownload).not.toHaveBeenCalled()
    })

    test("doesn't download a HEIC photo, which can't be shown", async () => {
        adminSession([row({ mime_type: 'image/heic' })])

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ error: DOCUMENT_ERRORS.unsupported })
        expect(serviceDownload).not.toHaveBeenCalled()
    })

    test('checks a PDF on first open, records it, and opens it', async () => {
        const { rpc } = adminSession([row({}), row({ preview_status: 'ready' })])
        serviceDownload.mockResolvedValue(stored(PDF_BYTES, 'application/pdf'))

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ kind: 'pdf', url: `https://signed.test/${PROPERTY}/${DOCUMENT}/file` })
        expect(serviceDownload).toHaveBeenCalledWith(`${PROPERTY}/${DOCUMENT}/file`)
        expect(rpc).toHaveBeenCalledWith('record_document_preview', { document_id: DOCUMENT, preview_status: 'ready' })
        expect(convertToPdf).not.toHaveBeenCalled()
    })

    test("records a mismatch when the bytes aren't what the type says", async () => {
        const { rpc } = adminSession([row({})])
        serviceDownload.mockResolvedValue(stored(new TextEncoder().encode('<html>'), 'application/pdf'))

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ error: DOCUMENT_ERRORS.mismatch })
        expect(rpc).toHaveBeenCalledWith('record_document_preview', { document_id: DOCUMENT, preview_status: 'type_mismatch' })
    })

    test('records a mismatch when the file was stored as a different type', async () => {
        const { rpc } = adminSession([row({})])
        serviceDownload.mockResolvedValue(stored(PDF_BYTES, 'application/msword'))

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ error: DOCUMENT_ERRORS.mismatch })
        expect(rpc).toHaveBeenCalledWith('record_document_preview', { document_id: DOCUMENT, preview_status: 'type_mismatch' })
    })

    test("says so when the owner's upload never arrived, and records nothing", async () => {
        const { rpc } = adminSession([row({})])
        serviceDownload.mockResolvedValue({ data: null, error: { message: 'Object not found' } })

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ error: DOCUMENT_ERRORS.missingFile })
        expect(rpc).not.toHaveBeenCalled()
    })

    test("converts a Word file, stores the PDF as the admin, records it and opens the PDF", async () => {
        const previewPath = `${PROPERTY}/${DOCUMENT}.pdf`
        const { rpc, upload, storageFrom } = adminSession([
            row({ mime_type: DOCX }),
            row({ mime_type: DOCX, preview_status: 'ready', preview_path: previewPath }),
        ])
        serviceDownload.mockResolvedValue(stored(DOCX_BYTES, DOCX))

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ kind: 'pdf', url: `https://signed.test/${previewPath}` })
        expect(convertToPdf).toHaveBeenCalledWith(expect.any(Uint8Array), DOCX)
        expect(storageFrom).toHaveBeenCalledWith('property-document-previews')
        expect(upload).toHaveBeenCalledWith(previewPath, expect.any(Blob), { contentType: 'application/pdf', upsert: false })
        expect(rpc).toHaveBeenCalledWith('record_document_preview', { document_id: DOCUMENT, preview_status: 'ready' })
    })

    test('records a failed conversion so it can be tried again', async () => {
        const { rpc, upload } = adminSession([row({ mime_type: DOCX })])
        serviceDownload.mockResolvedValue(stored(DOCX_BYTES, DOCX))
        convertToPdf.mockRejectedValue(new Error('The converter answered 503.'))

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ error: DOCUMENT_ERRORS.conversionFailed })
        expect(rpc).toHaveBeenCalledWith('record_document_preview', { document_id: DOCUMENT, preview_status: 'failed' })
        expect(upload).not.toHaveBeenCalled()
    })

    test('uses a PDF an earlier open stored but never recorded', async () => {
        const previewPath = `${PROPERTY}/${DOCUMENT}.pdf`
        const { rpc, upload } = adminSession([
            row({ mime_type: DOCX, preview_status: 'failed' }),
            row({ mime_type: DOCX, preview_status: 'ready', preview_path: previewPath }),
        ])
        serviceDownload.mockResolvedValue(stored(DOCX_BYTES, DOCX))
        upload.mockResolvedValue({ data: null, error: { code: 'ResourceAlreadyExists', message: 'The resource already exists' } })

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ kind: 'pdf', url: `https://signed.test/${previewPath}` })
        expect(rpc).toHaveBeenCalledWith('record_document_preview', { document_id: DOCUMENT, preview_status: 'ready' })
    })

    test('opens what another admin recorded when they got there first', async () => {
        const { rpc } = adminSession([row({}), row({ preview_status: 'ready' })])
        serviceDownload.mockResolvedValue(stored(PDF_BYTES, 'application/pdf'))
        rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'This document has already been checked.' } })

        expect(await openPropertyDocument(DOCUMENT)).toEqual({ kind: 'pdf', url: `https://signed.test/${PROPERTY}/${DOCUMENT}/file` })
    })
})
