import { describe, expect, test } from 'vitest'

import { formatDigitalAddress, POSTCODE_LETTER_BY_REGION, splitDigitalAddress } from '../lib/digital-address'
import { locationSchema, regionSchema } from '../lib/validators/property'

describe('formatDigitalAddress', () => {
    test('adds the dashes as each character is typed', () => {
        const steps = ['G', 'GA', 'GA1', 'GA-18', 'GA-183', 'GA-1834', 'GA-183-42', 'GA-183-429', 'GA-183-4290']
        expect(steps.map((value) => formatDigitalAddress(value))).toEqual([
            'G', 'GA', 'GA-1', 'GA-18', 'GA-183', 'GA-183-4', 'GA-183-42', 'GA-183-429', 'GA-183-4290',
        ])
    })

    test('reflows to a 4-digit area when the 8th digit is typed', () => {
        expect(formatDigitalAddress('GA-018-34290')).toBe('GA-0183-4290')
    })

    test('uppercases and drops spaces, dots and anything past 8 digits', () => {
        expect(formatDigitalAddress(' ga 183.4290 99')).toBe('GA-1834-2909')
        expect(formatDigitalAddress('ga1834290')).toBe('GA-183-4290')
    })

    test("puts the region's letter first when the user types only the district letter", () => {
        expect(formatDigitalAddress('a', 'G')).toBe('GA')
        expect(formatDigitalAddress('a183', 'G')).toBe('GA-183')
    })

    test("leaves a typed region letter alone, so the user can still type it themselves", () => {
        expect(formatDigitalAddress('g', 'G')).toBe('G')
        expect(formatDigitalAddress('ga', 'G')).toBe('GA')
    })

    test("doesn't rewrite a pasted address from another region; the schema reports it instead", () => {
        expect(formatDigitalAddress('AK-039-5028', 'G')).toBe('AK-039-5028')
    })

    test('clears to empty, so an untouched optional field stays empty', () => {
        expect(formatDigitalAddress('', 'G')).toBe('')
    })

    test('formats numbers on their own without a stray leading dash', () => {
        expect(formatDigitalAddress('1834290')).toBe('183-4290')
    })
})

describe('splitDigitalAddress', () => {
    test('splits the letters from the numbers for the two boxes', () => {
        expect(splitDigitalAddress('GA-183-4290')).toEqual({ letters: 'GA', numbers: '183-4290' })
        expect(splitDigitalAddress('G')).toEqual({ letters: 'G', numbers: '' })
        expect(splitDigitalAddress('')).toEqual({ letters: '', numbers: '' })
    })
})

describe('POSTCODE_LETTER_BY_REGION', () => {
    test('has a letter for every region', () => {
        expect(Object.keys(POSTCODE_LETTER_BY_REGION).sort()).toEqual([...regionSchema.options].sort())
    })

    test('gives the 2018 regions the letter of the region they came from', () => {
        expect(POSTCODE_LETTER_BY_REGION.Oti).toBe(POSTCODE_LETTER_BY_REGION.Volta)
        expect(POSTCODE_LETTER_BY_REGION['Western North']).toBe(POSTCODE_LETTER_BY_REGION.Western)
        expect(POSTCODE_LETTER_BY_REGION.Savannah).toBe(POSTCODE_LETTER_BY_REGION.Northern)
        expect(POSTCODE_LETTER_BY_REGION['North East']).toBe(POSTCODE_LETTER_BY_REGION.Northern)
        expect(POSTCODE_LETTER_BY_REGION['Bono East']).toBe(POSTCODE_LETTER_BY_REGION.Bono)
        expect(POSTCODE_LETTER_BY_REGION.Ahafo).toBe(POSTCODE_LETTER_BY_REGION.Bono)
    })
})

describe('Location schema digital address', () => {
    const location = { region: 'Greater Accra', municipality: 'Ayawaso West', city: 'East Legon' }
    const parse = (digital_address: string, region = 'Greater Accra') =>
        locationSchema.safeParse({ ...location, region, municipality: region === 'Oti' ? 'Jasikan' : location.municipality, digital_address })

    test('accepts a 3- or 4-digit area', () => {
        expect(parse('GA-183-4290').success).toBe(true)
        expect(parse('GA-0183-4290').success).toBe(true)
    })

    test('rejects other lengths', () => {
        expect(parse('GA-18-4290').success).toBe(false)
        expect(parse('GA-183-429').success).toBe(false)
        expect(parse('GA-01834-4290').success).toBe(false)
    })

    test("rejects another region's letter with a message naming the right one", () => {
        expect(parse('AK-039-5028').error?.issues).toEqual([
            expect.objectContaining({ path: ['digital_address'], message: 'Digital addresses in Greater Accra start with G' }),
        ])
    })

    test('accepts an Oti address starting with V, the Volta letter it kept', () => {
        expect(parse('VJ-123-4567', 'Oti').success).toBe(true)
    })

    test('reports only the format error while the format is wrong', () => {
        expect(parse('AK-12').error?.issues).toHaveLength(1)
    })
})
