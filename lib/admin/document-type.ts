// The first check before an admin opens a document (docs/admin.md, section 7): does the file start the way its
// declared type says it should? The bucket trusts the type the browser sent, so a Word file named .pdf, or a web page
// named .jpg, would otherwise be handed to the admin's browser or the converter as something it isn't.
// Only fixed byte signatures are read. Nothing here parses the file, which is the converter's job, in isolation.

const ascii = (text: string) => Array.from(text, (character) => character.charCodeAt(0))

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
    return bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte)
}

// Whether the text appears anywhere in the file. Zip archives store their entries' names uncompressed, so this finds
// an entry by name without unpacking anything.
function contains(bytes: Uint8Array, text: string) {
    const needle = ascii(text)
    outer: for (let start = 0; start <= bytes.length - needle.length; start++) {
        for (let index = 0; index < needle.length; index++) {
            if (bytes[start + index] !== needle[index]) continue outer
        }
        return true
    }
    return false
}

const ZIP = [0x50, 0x4b, 0x03, 0x04]
// The container every Word file before 2007 uses
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

// A DOCX is a zip with a Word document inside. One holding macros (vbaProject.bin) is a .docm renamed to .docx:
// the bucket refuses .docm, so it is refused here as well.
function isDocx(bytes: Uint8Array) {
    return startsWith(bytes, ZIP) && contains(bytes, "[Content_Types].xml") && contains(bytes, "word/") && !contains(bytes, "vbaProject.bin")
}

// An ODT is a zip whose first entry is a file called "mimetype", stored uncompressed, holding the type
function isOdt(bytes: Uint8Array) {
    return startsWith(bytes, ZIP) && startsWith(bytes, ascii("mimetypeapplication/vnd.oasis.opendocument.text"), 30)
}

const CHECKS: Record<string, (bytes: Uint8Array) => boolean> = {
    "application/pdf": (bytes) => startsWith(bytes, ascii("%PDF-")),
    "image/jpeg": (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
    "image/png": (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    "image/webp": (bytes) => startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8),
    "image/tiff": (bytes) => startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a]),
    "application/msword": (bytes) => startsWith(bytes, OLE),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": isDocx,
    "application/vnd.oasis.opendocument.text": isOdt,
}

/** Whether the file's bytes match its declared type. A type with no check, such as HEIC, never matches. */
export function matchesDeclaredType(bytes: Uint8Array, mimeType: string): boolean {
    return CHECKS[mimeType]?.(bytes) ?? false
}
