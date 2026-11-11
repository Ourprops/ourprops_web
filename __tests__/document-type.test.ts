import { describe, expect, test } from 'vitest'

import { matchesDeclaredType } from '../lib/admin/document-type'

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ODT = 'application/vnd.oasis.opendocument.text'

function bytes(...parts: (string | number[])[]) {
    return new Uint8Array(parts.flatMap((part) => (typeof part === 'string' ? Array.from(part, (c) => c.charCodeAt(0)) : part)))
}

// The start of a zip: the signature, then the rest of the first entry's 30-byte header, then its name
function zip(firstEntry: string, ...rest: string[]) {
    return bytes([0x50, 0x4b, 0x03, 0x04], new Array(26).fill(0), firstEntry, ...rest)
}

const FILES = {
    'application/pdf': bytes('%PDF-1.7\n'),
    'image/jpeg': bytes([0xff, 0xd8, 0xff, 0xe0]),
    'image/png': bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    'image/webp': bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '),
    'image/tiff': bytes([0x49, 0x49, 0x2a, 0x00]),
    'application/msword': bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    [DOCX]: zip('[Content_Types].xml', '...', 'word/document.xml'),
    [ODT]: zip('mimetypeapplication/vnd.oasis.opendocument.text'),
}

describe('matchesDeclaredType', () => {
    test.each(Object.entries(FILES))('takes a real %s', (type, file) => {
        expect(matchesDeclaredType(file, type)).toBe(true)
    })

    test.each(Object.keys(FILES))('takes a %s only as itself', (type) => {
        for (const [otherType, file] of Object.entries(FILES)) {
            if (otherType !== type) expect(matchesDeclaredType(file, type), `${otherType} as ${type}`).toBe(false)
        }
    })

    test('takes a big-endian TIFF, which some scanners write', () => {
        expect(matchesDeclaredType(bytes([0x4d, 0x4d, 0x00, 0x2a]), 'image/tiff')).toBe(true)
    })

    test('refuses a web page named as a PDF or an image', () => {
        const page = bytes('<!DOCTYPE html><script>alert(1)</script>')
        expect(matchesDeclaredType(page, 'application/pdf')).toBe(false)
        expect(matchesDeclaredType(page, 'image/png')).toBe(false)
    })

    test('refuses a macro-enabled Word file renamed to .docx', () => {
        expect(matchesDeclaredType(zip('[Content_Types].xml', 'word/document.xml', 'word/vbaProject.bin'), DOCX)).toBe(false)
    })

    test('refuses a zip that is neither a Word document nor an ODT', () => {
        const spreadsheet = zip('[Content_Types].xml', 'xl/workbook.xml')
        expect(matchesDeclaredType(spreadsheet, DOCX)).toBe(false)
        expect(matchesDeclaredType(zip('mimetypeapplication/vnd.oasis.opendocument.spreadsheet'), ODT)).toBe(false)
    })

    test('refuses a type it has no check for, such as HEIC', () => {
        expect(matchesDeclaredType(bytes([0, 0, 0, 0x18], 'ftypheic'), 'image/heic')).toBe(false)
    })

    test('refuses an empty or truncated file', () => {
        expect(matchesDeclaredType(new Uint8Array(), 'application/pdf')).toBe(false)
        expect(matchesDeclaredType(bytes('%PD'), 'application/pdf')).toBe(false)
    })
})
