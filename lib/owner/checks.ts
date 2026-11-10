// The seven checks as an owner sees them on their property page: the same plain words as the public record, with each
// check's state said for the owner, not the reviewer.

import { PUBLIC_CHECKS } from "@/lib/public-record"
import type { OwnCheckpoint } from "@/lib/supabase/owner-properties"

export type CheckState = "checked" | "attention" | "checking" | "skipped" | "not_started"

export const CHECK_STATES: Record<CheckState, string> = {
    checked: "Checked",
    attention: "Needs attention",
    checking: "Being checked",
    skipped: "Not checked",
    not_started: "Not started yet",
}

function stateOf(status: string): CheckState {
    switch (status) {
        case "verified":
            return "checked"
        case "flagged":
            return "attention"
        case "in_progress":
        case "submitted":
            return "checking"
        case "waived":
            return "skipped"
        default:
            return "not_started"
    }
}

export type OwnerCheck = { key: string; title: string; state: CheckState; note: string | null }

/**
 * The checks in the order the public record shows them, each with its state and the note our team wrote for the
 * owner. A note shows only where it explains something: a check needing attention, or one we didn't do.
 */
export function ownerChecks(checkpoints: OwnCheckpoint[]): OwnerCheck[] {
    return PUBLIC_CHECKS.map((check) => {
        const checkpoint = checkpoints.find((each) => each.checkpoint_key === check.key)
        const state = checkpoint ? stateOf(checkpoint.status) : "not_started"
        return {
            key: check.key,
            title: check.title,
            state,
            note: state === "attention" || state === "skipped" ? (checkpoint?.public_notes ?? null) : null,
        }
    })
}
