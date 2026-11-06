// Sends a Word or TIFF file to the converter (Gotenberg, docs/admin.md section 7) and gets a PDF back.
// Server only: the converter's address, and later its credentials, never reach the browser.
// Locally, start it with `docker compose -f converter/compose.yaml up -d`.

import { matchesDeclaredType } from "@/lib/admin/document-type"

/** Why a conversion failed. The admin sees only that it failed and can try again; the details go to the log. */
export class ConversionError extends Error {}

// LibreOffice picks how to read a file from its extension, so the file is named for its checked type,
// never with the name the owner gave it
const EXTENSIONS: Record<string, string> = {
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.oasis.opendocument.text": "odt",
    "image/tiff": "tiff",
}

// A cold Cloud Run instance has to start LibreOffice first
const TIMEOUT_MS = 60_000

// The size the preview bucket takes
const MAX_PDF_BYTES = 50 * 1024 * 1024

/** Converts a file whose type has already been checked to a PDF */
export async function convertToPdf(file: Uint8Array, mimeType: string): Promise<Uint8Array> {
    const baseUrl = process.env.DOCUMENT_CONVERTER_URL
    if (!baseUrl) {
        throw new ConversionError("DOCUMENT_CONVERTER_URL is not set.")
    }

    const extension = EXTENSIONS[mimeType]
    if (!extension) {
        throw new ConversionError(`${mimeType} files aren't converted.`)
    }

    const form = new FormData()
    form.append("files", new Blob([file as BlobPart], { type: mimeType }), `document.${extension}`)

    let response: Response
    try {
        response = await fetch(new URL("/forms/libreoffice/convert", baseUrl), {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
    } catch (error) {
        throw new ConversionError("The converter couldn't be reached.", { cause: error })
    }

    if (!response.ok) {
        throw new ConversionError(`The converter answered ${response.status}.`)
    }

    // What comes back is checked as well: the converter parsed an untrusted file, so its output isn't trusted either
    const pdf = new Uint8Array(await response.arrayBuffer())
    if (pdf.length > MAX_PDF_BYTES) {
        throw new ConversionError("The converted PDF is too large to store.")
    }
    if (!matchesDeclaredType(pdf, "application/pdf")) {
        throw new ConversionError("The converter didn't return a PDF.")
    }
    return pdf
}
