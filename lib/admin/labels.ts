// What the admin console calls the values stored in the review tables

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "In review",
    action_required: "Changes requested",
    active: "Active",
    suspended: "Suspended",
}

// In the order the console lists them (docs/admin.md, section 5)
export const CHECKPOINT_LABELS: Record<string, string> = {
    identity_verified: "Owner's identity",
    ownership_claim_verified: "Ownership claim",
    boundary_mapped: "Boundary mapped",
    cadastral_cross_check: "Cadastral cross-check",
    overlap_clearance: "No overlaps",
    official_search_status: "Lands Commission search",
    encumbrance_clearance: "Court cases and encumbrances",
}

export const CHECKPOINT_STATUS_LABELS: Record<string, string> = {
    unverified: "Not checked",
    submitted: "Evidence sent",
    in_progress: "Being checked",
    verified: "Verified",
    flagged: "Flagged",
    waived: "Waived",
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
    unreviewed: "Not reviewed",
    accepted: "Accepted",
    rejected: "Rejected",
    superseded: "Superseded",
}

export const IDENTITY_STATUS_LABELS: Record<string, string> = {
    unreviewed: "Not reviewed",
    verified: "Verified",
    rejected: "Rejected",
}

export const IDENTITY_DOCUMENT_LABELS: Record<string, string> = {
    ghana_card: "Ghana Card",
    passport: "Passport",
}

export const ENCUMBRANCE_KIND_LABELS: Record<string, string> = {
    mortgage: "Mortgage",
    caveat: "Caveat",
    litigation: "Court case",
    lease: "Lease",
    other: "Other",
}

export const OVERLAP_STATUS_LABELS: Record<string, string> = {
    detected: "Detected",
    investigating: "Investigating",
    resolved_valid: "Resolved: overlap is real",
    resolved_false_positive: "Resolved: not an overlap",
}

export const BOUNDARY_SOURCE_LABELS: Record<string, string> = {
    manual_draw: "Drawn on the map",
    cadastral_coords: "Cadastral coordinates",
    geojson_import: "Imported file",
    ground_survey: "Ground survey",
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
    property_submitted: "Submitted by the owner",
    property_review_started: "Review started",
    checkpoint_updated: "Checkpoint updated",
    encumbrance_recorded: "Encumbrance recorded",
    encumbrance_updated: "Encumbrance updated",
}

// Falls back to the stored value, so a new status shows up rather than disappearing
export function labelFor(labels: Record<string, string>, value: string | null | undefined) {
    if (!value) return "—"
    return labels[value] ?? value
}
