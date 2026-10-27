import type { Region } from "@/lib/validators/property"

// The first letter of a GhanaPost GPS address. The codes predate the 2018 regions,
// so the six new regions kept the letter of the region they were carved from.
// Source: Wikipedia "Postal codes in Ghana" (the GhanaPost postcode district table).
export const POSTCODE_LETTER_BY_REGION: Record<Region, string> = {
    "Greater Accra": "G",
    "Ashanti": "A",
    "Eastern": "E",
    "Western": "W",
    "Western North": "W",
    "Central": "C",
    "Northern": "N",
    "Savannah": "N",
    "North East": "N",
    "Upper East": "U",
    "Upper West": "X",
    "Volta": "V",
    "Oti": "V",
    "Bono": "B",
    "Bono East": "B",
    "Ahafo": "B",
}

// Two letters, an area of 3 or 4 digits, then 4 digits: GA-183-4290 or GA-0183-4290
export const DIGITAL_ADDRESS_PATTERN = /^[A-Z]{2}-\d{3,4}-\d{4}$/

// Tidies what the user typed into AA-NNN-NNNN as they go: uppercase, dashes added, anything else dropped.
// The area can be 3 or 4 digits, so it splits 3 + the rest until the 8th digit makes it 4-4.
export function formatDigitalAddress(raw: string, regionLetter?: string) {
    const characters = raw.toUpperCase().replace(/[^A-Z0-9]/g, "")
    let letters = characters.match(/^[A-Z]{0,2}/)![0]
    const digits = characters.slice(letters.length).replace(/\D/g, "").slice(0, 8)

    // Letter 1 comes from the region, so a lone letter that isn't the region's is taken as the district letter
    if (regionLetter && letters.length === 1 && letters !== regionLetter) letters = regionLetter + letters

    const area = digits.length === 8 ? 4 : 3
    return [letters, digits.slice(0, area), digits.slice(area)].filter(Boolean).join("-")
}

// Splits "GA-183-4290" into its letters and the numbers after them, for the two boxes of the input
export function splitDigitalAddress(value: string) {
    const letters = value.match(/^[A-Z]{0,2}/)![0]
    return { letters, numbers: value.slice(letters.length).replace(/^-/, "") }
}
