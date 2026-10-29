import { describe, expect, test } from 'vitest'

import { documentMimeType, propertyDocumentPath } from '../lib/storage/property-documents'

const PROPERTY_ID = '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const DOCUMENT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

describe('propertyDocumentPath', () => {
    test('stores a document under its property and document ids', () => {
        expect(propertyDocumentPath(PROPERTY_ID, DOCUMENT_ID, 'indenture.pdf')).toBe(`${PROPERTY_ID}/${DOCUMENT_ID}/indenture.pdf`)
    })

    test('lowercases the ids, as Postgres writes them', () => {
        expect(propertyDocumentPath(PROPERTY_ID.toUpperCase(), DOCUMENT_ID.toUpperCase(), 'a.pdf')).toBe(`${PROPERTY_ID}/${DOCUMENT_ID}/a.pdf`)
    })

    test.each([
        ['spaces and brackets', 'Site plan (final).PDF', 'Site-plan-final.pdf'],
        ['accents', 'Akwasi Agyeman – indenture.pdf', 'Akwasi-Agyeman-indenture.pdf'],
        ['slashes, which would add folders', '../../other/plan.pdf', 'other-plan.pdf'],
        ['no name before the extension', '.pdf', 'pdf'],
        ['nothing usable', '???', 'document'],
        ['no extension', 'scan', 'scan'],
    ])('makes a safe file name from one with %s', (_, fileName, expected) => {
        expect(propertyDocumentPath(PROPERTY_ID, DOCUMENT_ID, fileName)).toBe(`${PROPERTY_ID}/${DOCUMENT_ID}/${expected}`)
    })
})

describe('documentMimeType', () => {
    test.each([
        ['a Word file', 'Indenture.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ['an older Word file', 'Agreement.DOC', 'application/msword', 'application/msword'],
        ['a Word file Android reports as generic data', 'Indenture.docx', 'application/octet-stream', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ['a LibreOffice file with no type', 'Agreement.odt', '', 'application/vnd.oasis.opendocument.text'],
        ['a scan', 'Site plan.TIF', '', 'image/tiff'],
        ['an iPhone photo with no type', 'IMG_2041.HEIC', '', 'image/heic'],
    ])('works out the type of %s', (_, name, type, expected) => {
        expect(documentMimeType({ name, type })).toBe(expected)
    })

    test("leaves a type the bucket doesn't take as reported, so it is refused", () => {
        expect(documentMimeType({ name: 'Agreement.docm', type: 'application/vnd.ms-word.document.macroEnabled.12' })).toBe(
            'application/vnd.ms-word.document.macroEnabled.12',
        )
    })
})
