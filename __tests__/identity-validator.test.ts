import { describe, expect, test } from 'vitest'

import { identityFilePath, identityMimeType, IDENTITY_FILE_ACCEPT } from '../lib/storage/identity-documents'
import { identityDocumentSchema } from '../lib/validators/identity'
import { countryOptions } from '../lib/countries'

const PROFILE = '11111111-1111-4111-8111-111111111111'
const nextYear = `${new Date().getFullYear() + 1}-06-30`

function card(fields: Record<string, unknown> = {}) {
    return { documentType: 'ghana_card', documentNumber: 'GHA-123456789-0', expiresOn: nextYear, filePath: `${PROFILE}/a.jpg`, ...fields }
}

function passport(fields: Record<string, unknown> = {}) {
    return { ...card(), documentType: 'passport', issuingCountry: 'gb', documentNumber: '123456789', ...fields }
}

describe('identityDocumentSchema', () => {
    test.each([
        ['as printed', 'GHA-123456789-0'],
        ['in lower case with spaces', ' gha-123456789-0 '],
        ['without the dashes', 'GHA1234567890'],
    ])('takes a Ghana Card number typed %s, and stores it one way', (_, typed) => {
        const parsed = identityDocumentSchema.parse(card({ documentNumber: typed }))
        expect(parsed.documentNumber).toBe('GHA-123456789-0')
    })

    test('sets a Ghana Card to Ghana whatever the form sent', () => {
        expect(identityDocumentSchema.parse(card({ issuingCountry: 'GB' })).issuingCountry).toBe('GH')
    })

    test.each(['123456789', 'GHA-12345678-0', 'GHA-123456789-00', 'GHB-123456789-0'])(
        "refuses %s, which isn't a Ghana Card number",
        (number) => {
            const result = identityDocumentSchema.safeParse(card({ documentNumber: number }))
            expect(result.error?.issues[0].message).toBe('Enter the number as it is on the card, like GHA-123456789-0.')
        }
    )

    test('takes a passport with its country, in capitals', () => {
        const parsed = identityDocumentSchema.parse(passport({ documentNumber: ' g123 4567 ' }))
        expect(parsed).toMatchObject({ documentType: 'passport', issuingCountry: 'GB', documentNumber: 'G1234567' })
    })

    test("refuses a passport country that isn't a country", () => {
        const result = identityDocumentSchema.safeParse(passport({ issuingCountry: 'XX' }))
        expect(result.error?.issues[0].message).toBe('Choose the country that issued the passport.')
    })

    test('refuses a passport number with symbols, or too short', () => {
        expect(identityDocumentSchema.safeParse(passport({ documentNumber: '12-34567' })).success).toBe(false)
        expect(identityDocumentSchema.safeParse(passport({ documentNumber: '1234' })).success).toBe(false)
    })

    test('refuses a document that expired, or expires today', () => {
        const today = new Date().toISOString().slice(0, 10)
        for (const expiresOn of ['2020-01-01', today]) {
            const result = identityDocumentSchema.safeParse(card({ expiresOn }))
            expect(result.error?.issues[0].message).toBe('This document has expired. Add one that is still valid.')
        }
    })

    test('refuses any other kind of document', () => {
        const result = identityDocumentSchema.safeParse(card({ documentType: 'driving_licence' }))
        expect(result.error?.issues[0].message).toBe('Choose a Ghana Card or a passport.')
    })

    test('needs the uploaded photo', () => {
        expect(identityDocumentSchema.safeParse(card({ filePath: '' })).error?.issues[0].message).toBe(
            'Upload a photo or scan of the document.'
        )
    })
})

describe('identity photos', () => {
    test("store under the owner's folder with a random name, not the owner's file name", () => {
        const first = identityFilePath(PROFILE, 'image/jpeg')
        expect(first).toMatch(new RegExp(`^${PROFILE}/[0-9a-f-]{36}\\.jpg$`))
        expect(identityFilePath(PROFILE, 'image/jpeg')).not.toBe(first)
    })

    test('work out the type from the extension when the browser reports none', () => {
        expect(identityMimeType({ name: 'card.JPG', type: '' })).toBe('image/jpeg')
    })

    test("don't take HEIC, so iPhones send a JPEG", () => {
        expect(identityMimeType({ name: 'IMG_1.HEIC', type: 'image/heic' })).toBe('image/heic')
        expect(IDENTITY_FILE_ACCEPT).not.toContain('heic')
    })
})

describe('countryOptions', () => {
    test('puts Ghana first, then every other country by name', () => {
        const options = countryOptions()
        expect(options[0]).toEqual(['GH', 'Ghana'])
        expect(options.length).toBe(249)
        expect(options.find(([code]) => code === 'GB')?.[1]).toBe('United Kingdom')
    })
})
