import { z } from "zod"

import { COUNTRY_CODES } from "@/lib/countries"

// The identity document an owner saves on /account/identity. save_identity_document checks the expiry date, the file's
// folder and that the number isn't on another account; the format of each kind of number is checked here.

export const IDENTITY_DOCUMENT_TYPES = { ghana_card: "Ghana Card", passport: "Passport" } as const

export const IDENTITY_STATUS_LABELS: Record<string, string> = {
    unreviewed: "Being checked",
    verified: "Verified",
    rejected: "Not accepted",
}

const spaceless = (value: string) => value.replace(/\s/g, "").toUpperCase()

/** The 10 digits of a Ghana Card number from whatever was typed or pasted: with or without GHA, dashes or spaces */
export function ghanaCardDigits(value: string): string {
    return value.toUpperCase().replace(/^\s*GHA/, "").replace(/\D/g, "").slice(0, 10)
}

/**
 * The digits as they appear after GHA- on the card: nine, then a dash and the last. The dash appears only with the
 * tenth digit, so deleting never gets stuck on it.
 */
export function formatGhanaCardDigits(digits: string): string {
    return digits.length > 9 ? `${digits.slice(0, 9)}-${digits.slice(9)}` : digits
}

// A Ghana Card number is GHA-, nine digits, a dash and a check digit. People often leave the dashes out.
const ghanaCardNumber = z
    .string()
    .transform(spaceless)
    .transform((value) => (/^GHA\d{10}$/.test(value) ? `GHA-${value.slice(3, 12)}-${value.slice(12)}` : value))
    .pipe(z.string().regex(/^GHA-\d{9}-\d$/, { error: "Enter the number as it is on the card, like GHA-123456789-0." }))

// Passport numbers vary by country, but are letters and digits
const passportNumber = z
    .string()
    .transform(spaceless)
    .pipe(z.string().regex(/^[A-Z0-9]{5,20}$/, { error: "Enter the passport number as it is on the photo page." }))

// An ISO date from a date input, after today. The database checks this again.
const expiresOn = z.iso.date({ error: "Enter the expiry date." }).refine((value) => value > new Date().toISOString().slice(0, 10), {
    error: "This document has expired. Add one that is still valid.",
})

const passportCountry = z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => COUNTRY_CODES.includes(value), { error: "Choose the country that issued the passport." })

const filePath = z.string().min(1, { error: "Upload a photo or scan of the document." })

export const identityDocumentSchema = z.discriminatedUnion(
    "documentType",
    [
        z.object({
            documentType: z.literal("ghana_card"),
            // Every Ghana Card is issued by Ghana, so the form doesn't ask
            issuingCountry: z.unknown().optional().transform(() => "GH"),
            documentNumber: ghanaCardNumber,
            expiresOn,
            filePath,
        }),
        z.object({
            documentType: z.literal("passport"),
            issuingCountry: passportCountry,
            documentNumber: passportNumber,
            expiresOn,
            filePath,
        }),
    ],
    { error: "Choose a Ghana Card or a passport." }
)

export type IdentityDocumentInput = z.output<typeof identityDocumentSchema>

// What an admin types to find the account holding a document, with the same rules as the owner's form, so a number
// is normalised the same way it was when it was saved
export const identityLookupSchema = z.discriminatedUnion(
    "documentType",
    [
        z.object({
            documentType: z.literal("ghana_card"),
            issuingCountry: z.unknown().optional().transform(() => "GH"),
            documentNumber: ghanaCardNumber,
        }),
        z.object({
            documentType: z.literal("passport"),
            issuingCountry: passportCountry,
            documentNumber: passportNumber,
        }),
    ],
    { error: "Choose a Ghana Card or a passport." }
)
