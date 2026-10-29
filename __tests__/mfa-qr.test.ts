import { describe, expect, test } from 'vitest'

import { toQrCodeDataUrl } from '../lib/queries/mfa'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6"><rect x="0" y="0" width="3" height="3" style="fill:black;stroke:none" /></svg>'

describe('QR code for setting up an authenticator app', () => {
    test("turns Supabase's unencoded SVG with a trailing newline into a clean data URL", () => {
        const url = toQrCodeDataUrl(`data:image/svg+xml;utf-8,${SVG}\n`)

        // next/image refuses a src that ends with whitespace, which crashed the security page
        expect(url).toBe(url.trimEnd())
        expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
        // Encoded, so characters like < and " can't break the URL
        expect(url).not.toMatch(/[<>"\s]/)
    })

    test('keeps the QR code itself unchanged', () => {
        const url = toQrCodeDataUrl(`data:image/svg+xml;utf-8,${SVG}\n`)

        expect(decodeURIComponent(url.slice(url.indexOf(',') + 1))).toBe(SVG)
    })

    test('also accepts bare SVG markup, in case Supabase drops the prefix', () => {
        const url = toQrCodeDataUrl(`  ${SVG}  `)

        expect(decodeURIComponent(url.slice(url.indexOf(',') + 1))).toBe(SVG)
    })
})
