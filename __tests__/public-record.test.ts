// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'

import { describeArea, getPublicRecord } from '../lib/public-record'

describe('getPublicRecord', () => {
    test("doesn't ask the database about something that can't be a reference", async () => {
        const rpc = vi.fn()
        for (const reference of ['', 'abc', 'PROP-', 'PROP-../../x', "PROP-a' or 1=1"]) {
            expect(await getPublicRecord({ rpc } as never, reference)).toBeNull()
        }
        expect(rpc).not.toHaveBeenCalled()
    })

    test('returns the record, or null when there is none', async () => {
        const record = { prop_id: 'PROP-abc123', status: 'active' }
        const rpc = vi.fn().mockResolvedValueOnce({ data: [record], error: null }).mockResolvedValueOnce({ data: [], error: null })

        expect(await getPublicRecord({ rpc } as never, 'PROP-abc123')).toEqual(record)
        expect(rpc).toHaveBeenCalledWith('public_property_record', { reference: 'PROP-abc123' })
        expect(await getPublicRecord({ rpc } as never, 'PROP-zzz999')).toBeNull()
    })
})

describe('describeArea', () => {
    test('gives square metres with acres, as land is talked about in Ghana', () => {
        expect(describeArea(4047)).toBe('4,047 m² (about 1.00 acres)')
        expect(describeArea(60702)).toBe('60,702 m² (about 15 acres)')
    })
})
