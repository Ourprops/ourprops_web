// What the owner's dashboard says: the things that need them, and where each property is. Pure, so it can be tested
// without a database; the page loads the data and renders what this returns.

import type { ChangeRequestChecklist, IdentityStatus } from "@/lib/change-requests"
import type { OwnPropertySummary } from "@/lib/supabase/owner-properties"

export type TodoItem = {
    key: string
    // waiting: we need something; ready: one tap finishes it; start: something to begin
    tone: "waiting" | "ready" | "start"
    title: string
    text: string
    href: string
    action: string
}

const named = (property: Pick<OwnPropertySummary, "name">) => property.name ?? "Your property"

/**
 * Everything that needs the owner, most urgent first: properties we're waiting on, then their identity document,
 * then drafts they haven't finished. Nothing in it means they're all caught up.
 */
export function ownerTodos(input: {
    properties: OwnPropertySummary[]
    checklists: Map<string, ChangeRequestChecklist>
    identityStatus: IdentityStatus
}): TodoItem[] {
    const todos: TodoItem[] = []

    for (const property of input.properties.filter((each) => each.status === "action_required")) {
        const href = `/account/dashboard/properties/${property.id}`
        if (input.checklists.get(property.id)?.complete) {
            todos.push({
                key: `send-${property.id}`,
                tone: "ready",
                title: `Send ${named(property)} back to us`,
                text: "Everything we asked for is here. Send it back so we can carry on checking.",
                href,
                action: "Send it back",
            })
        } else {
            todos.push({
                key: `request-${property.id}`,
                tone: "waiting",
                title: `We need something for ${named(property)}`,
                text: property.changes_requested_message ?? "See what we need, and send it.",
                href,
                action: "See what we need",
            })
        }
    }

    if (input.identityStatus === "rejected") {
        todos.push({
            key: "identity",
            tone: "waiting",
            title: "Send your identity document again",
            text: "We couldn't accept the one you sent. See why, and send it again.",
            href: "/account/identity",
            action: "See why",
        })
    } else if (input.identityStatus === null) {
        todos.push({
            key: "identity",
            tone: "start",
            title: "Verify your identity",
            text: "Add your Ghana Card, or your passport if you live abroad. You do it once, for all your properties.",
            href: "/account/identity",
            action: "Add your document",
        })
    }

    for (const property of input.properties.filter((each) => each.status === "draft")) {
        todos.push({
            key: `draft-${property.id}`,
            tone: "start",
            title: `Finish registering ${property.name ?? "your property"}`,
            text: "It's saved as a draft. Pick up where you left off, then send it to us.",
            href: `/account/dashboard/properties/new?draft=${property.id}`,
            action: "Continue",
        })
    }

    return todos
}

/** The four steps every property goes through, as the owner sees them */
export const PROPERTY_STEPS = ["Registered", "Sent", "Being checked", "Verified"] as const

/**
 * How far a property has got: the index of the step it's on, and whether that step is done. A suspended property
 * has been through every step but isn't shown as verified, so it is marked paused.
 */
export function propertyStage(status: string): { step: number; state: "done" | "current" | "paused" } {
    switch (status) {
        case "draft":
            return { step: 0, state: "current" }
        case "submitted":
            return { step: 1, state: "done" }
        case "under_review":
        case "action_required":
            return { step: 2, state: "current" }
        case "active":
            return { step: 3, state: "done" }
        case "suspended":
            return { step: 3, state: "paused" }
        default:
            return { step: 0, state: "current" }
    }
}

/** What the property's status means for the owner, in a few words, and what happens next */
export const STATUS_EXPLAINED: Record<string, { label: string; next: string }> = {
    draft: { label: "Draft", next: "Finish registering it and send it to us." },
    submitted: { label: "Sent", next: "We'll start checking it soon." },
    under_review: { label: "Being checked", next: "Our team is checking it. We'll tell you if we need anything." },
    action_required: { label: "We need something from you", next: "See what we asked for, then send it back." },
    active: { label: "Verified by OurProps", next: "You can share its public record." },
    suspended: { label: "Verification paused", next: "It isn't shown as verified while we check it again." },
}
