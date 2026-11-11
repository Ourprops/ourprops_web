// What the decision panel on the property review page summarises: how far the review has got, and where on the page
// each thing still blocking approval is dealt with.

import { CHECKPOINT_LABELS } from "@/lib/admin/labels"
import type { PropertyForReview } from "@/lib/admin/review"

/** The ids of the page's sections, so links and the sections can't drift apart */
export const SECTION_IDS = {
    owner: "owner",
    answers: "answers",
    map: "map",
    documents: "documents",
    checkpoints: "checkpoints",
    encumbrances: "encumbrances",
    overlaps: "overlaps",
    history: "history",
} as const

export const checkpointAnchor = (key: string) => `checkpoint-${key}`

export type ReviewProgress = {
    checkpointsDone: number
    checkpointsTotal: number
    documentsToReview: number
    openOverlaps: number
}

/** Verified or waived checkpoints count as done, as approval counts them */
export function reviewProgress(review: Pick<PropertyForReview, "checkpoints" | "documents" | "overlaps">): ReviewProgress {
    return {
        checkpointsDone: review.checkpoints.filter((checkpoint) => checkpoint.status === "verified" || checkpoint.status === "waived").length,
        checkpointsTotal: Object.keys(CHECKPOINT_LABELS).length,
        documentsToReview: review.documents.filter((document) => document.verification_status === "unreviewed").length,
        openOverlaps: review.overlaps.filter((overlap) => overlap.status === "detected" || overlap.status === "investigating").length,
    }
}

/**
 * Where on the page a blocker from approval_blockers is dealt with, as a fragment id, or null if nowhere in particular.
 * The sentences come from the database (approval_blockers), whose checkpoint labels are the same as CHECKPOINT_LABELS.
 */
export function blockerAnchor(blocker: string): string | null {
    for (const [key, label] of Object.entries(CHECKPOINT_LABELS)) {
        if (blocker.startsWith(`${label} isn't`)) {
            // The identity checkpoint is verified only once the document is, which happens in the owner's section
            return key === "identity_verified" ? SECTION_IDS.owner : checkpointAnchor(key)
        }
    }
    if (blocker.includes("ownership type and structure")) return SECTION_IDS.answers
    // "1 document still needs reviewing." or "3 documents still need reviewing."
    if (blocker.includes("still need")) return SECTION_IDS.documents
    if (blocker.includes("overlap")) return SECTION_IDS.overlaps
    if (blocker.includes("asked for from the owner")) return SECTION_IDS.documents
    return null
}
