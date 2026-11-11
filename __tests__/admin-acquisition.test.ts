import { describe, expect, test } from 'vitest'

import { acquisitionDetails } from '../lib/admin/acquisition'

describe('acquisitionDetails', () => {
    test("spells out the seller and the document, saying plainly what wasn't given", () => {
        expect(acquisitionDetails('purchase_from_owner', { transferred_by: { name: 'Kwame Mensah' }, has_document: true })).toEqual([
            ["Seller's name", 'Kwame Mensah'],
            ["Seller's phone", 'Not given'],
            ['Has the transfer document', 'Yes'],
        ])
    })

    test('shows a document uploaded with the answer', () => {
        expect(acquisitionDetails('inheritance', { has_document: true, document: { file_name: 'Letters.pdf' } })).toEqual([
            ['Has inheritance documents', 'Yes'],
            ['Inheritance document', 'Uploaded with the answer: Letters.pdf'],
        ])
    })

    test.each([
        ['lease_sublease', { lease_years: 99 }, [['Length of lease', '99 years']]],
        ['lease_sublease', {}, [['Length of lease', 'Not given']]],
        ['other', { note: 'A gift from my uncle' }, [['In their words', 'A gift from my uncle']]],
        ['other', {}, [['In their words', 'Not given']]],
        ['inheritance', {}, [['Has inheritance documents', 'Not given']]],
    ])('handles %s with %j', (method, metadata, rows) => {
        expect(acquisitionDetails(method, metadata)).toEqual(rows)
    })

    test('copes with no answer stored at all', () => {
        expect(acquisitionDetails('purchase_from_owner', null)[0]).toEqual(["Seller's name", 'Not given'])
        expect(acquisitionDetails(null, null)).toEqual([])
    })
})
