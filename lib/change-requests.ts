// What an admin asked for when requesting changes, and whether each thing has arrived. The owner's property page and the
// admin's decision panel both show it, from this one rule, so they never disagree about what is still missing.
//
// It mirrors what resubmit_property checks before letting the owner send the property back: a file for each open
// document request, uploaded since it was asked for (answers_open_request), and, when identity was asked for, a saved
// identity document that isn't rejected. The database decides; this only describes.

export type IdentityStatus = "unreviewed" | "verified" | "rejected" | null

export type ChecklistItem =
    | { kind: "document"; id: string; slot: string; note: string; done: boolean }
    | { kind: "identity"; status: IdentityStatus; done: boolean }

export type ChangeRequestChecklist = {
    items: ChecklistItem[]
    // Everything asked for has arrived: all that's left is for the owner to send the property back
    complete: boolean
}

export function changeRequestChecklist(input: {
    openRequests: { id: string; slot: string; note: string; created_at: string }[]
    // Older documents may have no checklist item; they never answer a request
    documents: { slot: string | null; created_at: string }[]
    identityRequested: boolean
    identityStatus: IdentityStatus
}): ChangeRequestChecklist {
    const items: ChecklistItem[] = input.openRequests.map((request) => ({
        kind: "document",
        id: request.id,
        slot: request.slot,
        note: request.note,
        done: input.documents.some(
            (document) => document.slot === request.slot && Date.parse(document.created_at) >= Date.parse(request.created_at)
        ),
    }))

    if (input.identityRequested) {
        items.push({
            kind: "identity",
            status: input.identityStatus,
            done: input.identityStatus === "unreviewed" || input.identityStatus === "verified",
        })
    }

    return { items, complete: items.every((item) => item.done) }
}
