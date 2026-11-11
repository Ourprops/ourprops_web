// The owner's answer about how they got the property, spelled out for the reviewer. Every follow-up is optional
// (decided 2026-11-10), so each says plainly when it wasn't given: the reviewer can ask for it with "Ask the owner".

type Metadata = {
    transferred_by?: { name?: string; phone?: string }
    has_document?: boolean
    document?: { file_name?: string }
    lease_years?: number
    note?: string
}

const NOT_GIVEN = "Not given"

function hasDocument(value: boolean | undefined) {
    return value === true ? "Yes" : value === false ? "No" : NOT_GIVEN
}

/** The rows to show under "How they got it", as [label, value] */
export function acquisitionDetails(method: string | null, metadata: unknown): [string, string][] {
    const answer = (metadata && typeof metadata === "object" ? metadata : {}) as Metadata
    const uploaded = answer.document?.file_name ? `Uploaded with the answer: ${answer.document.file_name}` : null

    switch (method) {
        case "direct_purchase":
        case "transfer_assignment":
            return [["Document with the answer", uploaded ?? "None uploaded here; check the documents below"]]
        case "purchase_from_owner":
            return [
                ["Seller's name", answer.transferred_by?.name || NOT_GIVEN],
                ["Seller's phone", answer.transferred_by?.phone || NOT_GIVEN],
                ["Has the transfer document", hasDocument(answer.has_document)],
                ...(uploaded ? ([["Transfer document", uploaded]] as [string, string][]) : []),
            ]
        case "lease_sublease":
            return [["Length of lease", answer.lease_years ? `${answer.lease_years} years` : NOT_GIVEN]]
        case "inheritance":
            return [
                ["Has inheritance documents", hasDocument(answer.has_document)],
                ...(uploaded ? ([["Inheritance document", uploaded]] as [string, string][]) : []),
            ]
        case "other":
            return [["In their words", answer.note || NOT_GIVEN]]
        case "unsure":
            return [["Their answer", "Not sure. Work out how it was acquired from their documents."]]
        default:
            return []
    }
}
