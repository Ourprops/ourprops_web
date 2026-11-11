import { Check, ChevronRight, CircleDashed, CircleMinus, Clock, Inbox, TriangleAlert, type LucideIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActionForm } from "@/components/action-form"
import { StatusGlyph } from "@/components/owner/status-glyph"
import { Badge } from "@/components/ui/badge"
import {
    AUDIT_ACTION_LABELS,
    BOUNDARY_SOURCE_LABELS,
    CHECKPOINT_LABELS,
    CHECKPOINT_STATUS_LABELS,
    DOCUMENT_STATUS_LABELS,
    ENCUMBRANCE_KIND_LABELS,
    IDENTITY_DOCUMENT_LABELS,
    IDENTITY_STATUS_LABELS,
    OVERLAP_STATUS_LABELS,
    OWNERSHIP_STRUCTURE_LABELS,
    OWNERSHIP_TYPE_LABELS,
    PROPERTY_STATUS_LABELS,
    labelFor,
} from "@/lib/admin/labels"
import { getPropertyForReview, type PropertyForReview } from "@/lib/admin/review"
import { ChecklistMark } from "@/components/checklist-mark"
import { changeRequestChecklist, type IdentityStatus } from "@/lib/change-requests"
import { acquisitionDetails } from "@/lib/admin/acquisition"
import { SECTION_IDS, blockerAnchor, checkpointAnchor, reviewProgress, type ReviewProgress } from "@/lib/admin/review-summary"
import { requireAdmin } from "@/lib/auth/staff"
import { cn } from "@/lib/utils"
import { ACQUISITION_OPTIONS, DOCUMENT_SLOT_OPTIONS, DOCUMENT_TYPE_LABELS, TYPE_OPTIONS } from "@/lib/types/property"
import {
    CHECKPOINT_KEYS,
    DOCUMENT_OUTCOMES,
    ENCUMBRANCE_KINDS,
    MAX_ENCUMBRANCE_REFERENCE_LENGTH,
    OVERLAP_OUTCOMES,
} from "@/lib/validators/admin"

import {
    approveProperty,
    classifyProperty,
    openOwnerIdentityPhoto,
    openPropertyDocument,
    recordEncumbrance,
    reopenReview,
    requestChanges,
    resolveOverlap,
    retryIdentityPhotoDeletion,
    reviewDocument,
    reviewIdentityDocument,
    startReview,
    suspendProperty,
    updateCheckpoint,
    updateEncumbrance,
} from "./actions"
import { BoundaryMap } from "./boundary-map"
import { CheckpointForm } from "./checkpoint-form"
import { DocumentViewer } from "./document-viewer"
import { RequestItems } from "./request-items"
import { ChoiceField, NoteField, TextField, YesNoField } from "./fields"

export const metadata: Metadata = {
    title: "Property review",
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
})

function formatDate(value: string | null) {
    return value ? dateFormat.format(new Date(value)) : "—"
}

// The labels for just the values a form offers, in the order given
function pick(labels: Record<string, string>, values: readonly string[]) {
    return Object.fromEntries(values.map((value) => [value, labels[value] ?? value]))
}

// Every form below appears only in the status its database function accepts. That is a convenience:
// the function refuses anything else all the same.

// The review actions live in ./actions.ts, and each calls requireAdmin() itself (docs/admin.md, section 9)
export default async function PropertyReviewPage({ params }: PageProps<"/admin/properties/[id]">) {
    const { supabase } = await requireAdmin()
    const { id } = await params

    const review = await getPropertyForReview(supabase, id)
    if (!review) notFound()

    const { property } = review
    const progress = reviewProgress(review)
    const identityStatus = review.identity ? labelFor(IDENTITY_STATUS_LABELS, review.identity.verification_status) : "None saved"

    return (
        <div className="space-y-6">
            <header className="grid gap-3">
                <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-copy">
                    <Link href="/admin" className="transition-colors hover:text-primary">
                        Review queue
                    </Link>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate font-medium text-foreground">{property.name ?? "Untitled property"}</span>
                </nav>
                <div className="flex flex-wrap items-center gap-3">
                    <StatusGlyph status={property.status} className="size-5" />
                    <h1 className="text-display text-primary wrap-anywhere">{property.name ?? "Untitled property"}</h1>
                    <Badge variant="outline">{labelFor(PROPERTY_STATUS_LABELS, property.status)}</Badge>
                </div>
                <p className="flex flex-wrap gap-2 text-sm text-copy">
                    <span className="text-data rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">{property.prop_id}</span>
                    {property.owner ? <span className="rounded-full bg-muted px-2.5 py-1">{property.owner.full_name}</span> : null}
                </p>
            </header>

            {/* Wide screens: the evidence on the left and the decision beside it, in view while scrolling.
                Phones: the decision first, as before. */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                <aside
                    aria-label="Decision"
                    className="lg:sticky lg:top-6 lg:order-last lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
                >
                    <DecisionPanel review={review} progress={progress} identityStatus={identityStatus} />
                </aside>

                <div className="grid min-w-0 gap-6">
                    <Section id={SECTION_IDS.owner} title="Owner and identity" meta={identityStatus}>
                        <Fields
                            rows={[
                                ["Name", property.owner?.full_name],
                                ["Phone", property.owner?.phone_number],
                                [
                                    "Identity document",
                                    review.identity ? labelFor(IDENTITY_DOCUMENT_LABELS, review.identity.document_type) : "None saved",
                                ],
                                ["Issued by", review.identity?.issuing_country],
                                ["Expires", review.identity ? formatDate(review.identity.expires_on) : null],
                            ]}
                        />
                        {review.identity && property.owner ? (
                            <IdentityReview identity={review.identity} profileId={property.owner.id} />
                        ) : null}
                    </Section>

                    <Section id={SECTION_IDS.answers} title="The owner's answers">
                        <Fields
                            rows={[
                                ["Type", TYPE_OPTIONS.find((option) => option.value === property.property_type)?.title ?? property.property_type],
                                ["Description", property.description],
                                ["Region", property.region],
                                ["District", property.district_municipality],
                                ["City or town", property.city_town],
                                ["Address", property.address],
                                ["Digital address", property.digital_address],
                                ["Landmark", property.landmark],
                                [
                                    "How they got it",
                                    ACQUISITION_OPTIONS.find((option) => option.value === property.acquisition_method)?.title ??
                                        property.acquisition_method,
                                ],
                                // the follow-up answers, each optional for the owner, so a gap says "Not given"
                                ...acquisitionDetails(property.acquisition_method, property.acquisition_metadata),
                                [
                                    "Ownership type",
                                    property.ownership_type ? labelFor(OWNERSHIP_TYPE_LABELS, property.ownership_type) : "Not classified yet",
                                ],
                                [
                                    "Ownership structure",
                                    property.ownership_structure
                                        ? labelFor(OWNERSHIP_STRUCTURE_LABELS, property.ownership_structure)
                                        : "Not classified yet",
                                ],
                                [
                                    "Boundary",
                                    property.property_boundaries
                                        ? `${labelFor(BOUNDARY_SOURCE_LABELS, property.property_boundaries.source)}${
                                              property.property_boundaries.area_sqm
                                                  ? `, ${Math.round(property.property_boundaries.area_sqm).toLocaleString("en-GB")} m²`
                                                  : ""
                                          }`
                                        : "None",
                                ],
                            ]}
                        />
                        {property.status === "under_review" ? (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-primary">Classify the ownership</summary>
                                <ActionForm action={classifyProperty.bind(null, property.id)} submitLabel="Save" className="mt-3">
                                    <ChoiceField
                                        id="ownership-type"
                                        name="ownership_type"
                                        label="Ownership type"
                                        options={OWNERSHIP_TYPE_LABELS}
                                        defaultValue={property.ownership_type}
                                    />
                                    <ChoiceField
                                        id="ownership-structure"
                                        name="ownership_structure"
                                        label="Ownership structure"
                                        options={OWNERSHIP_STRUCTURE_LABELS}
                                        defaultValue={property.ownership_structure}
                                    />
                                </ActionForm>
                            </details>
                        ) : null}
                    </Section>

                    <Section id={SECTION_IDS.map} title="Map">
                        <PropertyMap review={review} />
                    </Section>

                    <Section
                        id={SECTION_IDS.documents}
                        title="Documents"
                        meta={
                            review.documents.length === 0
                                ? undefined
                                : progress.documentsToReview > 0
                                  ? `${progress.documentsToReview} to review`
                                  : "All reviewed"
                        }
                    >
                        <Documents documents={review.documents} editable={property.status === "under_review"} />
                    </Section>

                    <Section
                        id={SECTION_IDS.checkpoints}
                        title="Checkpoints"
                        meta={review.checkpoints.length > 0 ? `${progress.checkpointsDone} of ${progress.checkpointsTotal} done` : undefined}
                    >
                        <Checkpoints
                            checkpoints={review.checkpoints}
                            propertyId={property.id}
                            editable={property.status === "under_review"}
                        />
                    </Section>

                    <Section id={SECTION_IDS.encumbrances} title="Encumbrances">
                        <Encumbrances encumbrances={review.encumbrances} propertyId={property.id} />
                    </Section>

                    <Section
                        id={SECTION_IDS.overlaps}
                        title="Overlaps"
                        meta={progress.openOverlaps > 0 ? `${progress.openOverlaps} open` : undefined}
                    >
                        <Overlaps overlaps={review.overlaps} />
                    </Section>

                    <Section id={SECTION_IDS.history} title="History">
                        <History history={review.history} />
                    </Section>
                </div>
            </div>
        </div>
    )
}

// Beside the evidence: where the review stands, what still stops approval (each a link to where it is dealt with),
// and what the admin can do with the property as a whole
function DecisionPanel({
    review,
    progress,
    identityStatus,
}: {
    review: PropertyForReview
    progress: ReviewProgress
    identityStatus: string
}) {
    const { property } = review
    const percent = Math.round((progress.checkpointsDone / progress.checkpointsTotal) * 100)

    return (
        <div className="grid gap-5 rounded-xl border border-border bg-card shadow-card p-4">
            <h2 className="text-eyebrow text-muted-foreground">Decision</h2>

            {review.checkpoints.length > 0 ? (
                <dl className="grid gap-2 text-sm">
                    <div>
                        <div className="flex items-baseline justify-between gap-2">
                            <dt>
                                <a href={`#${SECTION_IDS.checkpoints}`} className="hover:text-primary">
                                    Checkpoints done
                                </a>
                            </dt>
                            <dd className="text-data">
                                {progress.checkpointsDone} of {progress.checkpointsTotal}
                            </dd>
                        </div>
                        <div
                            role="progressbar"
                            aria-label="Checkpoints done"
                            aria-valuenow={progress.checkpointsDone}
                            aria-valuemin={0}
                            aria-valuemax={progress.checkpointsTotal}
                            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                        >
                            <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
                        </div>
                    </div>
                    <SummaryRow href={`#${SECTION_IDS.documents}`} label="Documents to review" value={String(progress.documentsToReview)} />
                    <SummaryRow href={`#${SECTION_IDS.owner}`} label="Identity" value={identityStatus} />
                    {progress.openOverlaps > 0 ? (
                        <SummaryRow href={`#${SECTION_IDS.overlaps}`} label="Open overlaps" value={String(progress.openOverlaps)} />
                    ) : null}
                </dl>
            ) : null}

            {property.status === "under_review" ? (
                review.blockers.length > 0 ? (
                    <div className="grid gap-1.5 text-sm">
                        <p className="font-medium">Before it can be approved</p>
                        <ul className="grid gap-1">
                            {review.blockers.map((blocker) => {
                                const anchor = blockerAnchor(blocker)
                                return (
                                    <li key={blocker} className="flex gap-2 text-copy">
                                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                                        {anchor ? (
                                            <a href={`#${anchor}`} className="hover:text-primary hover:underline">
                                                {blocker}
                                            </a>
                                        ) : (
                                            <span>{blocker}</span>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ) : (
                    <p className="flex items-center gap-2 text-sm font-medium text-success">
                        <Check size={16} aria-hidden /> Ready to approve
                    </p>
                )
            ) : null}

            <StatusActions
                property={property}
                requests={review.requests}
                documents={review.documents}
                identityStatus={(review.identity?.verification_status ?? null) as IdentityStatus}
                blocked={review.blockers.length > 0}
            />
        </div>
    )
}

function SummaryRow({ href, label, value }: { href: string; label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <dt>
                <a href={href} className="hover:text-primary">
                    {label}
                </a>
            </dt>
            <dd className="text-right">{value}</dd>
        </div>
    )
}

// The owner's identity document: the photo and the review while it waits, and the photo's deletion if that failed.
// Identity is reviewed once per owner, whichever of their properties the admin is looking at.
function IdentityReview({ identity, profileId }: { identity: NonNullable<PropertyForReview["identity"]>; profileId: string }) {
    if (identity.verification_status === "unreviewed") {
        return (
            <div className="mt-4 grid gap-3">
                <DocumentViewer
                    fileName="Open the identity document"
                    description="The owner's photo of their document. It is deleted once you verify it."
                    open={openOwnerIdentityPhoto.bind(null, profileId)}
                />
                <details>
                    <summary className="cursor-pointer text-sm text-primary">Review the identity document</summary>
                    <ActionForm action={reviewIdentityDocument.bind(null, profileId)} submitLabel="Save" className="mt-3">
                        <ChoiceField
                            id="identity-status"
                            name="status"
                            label="Outcome"
                            options={{ verified: "Verified: the name matches and it is in date", rejected: "Rejected" }}
                        />
                        <NoteField
                            id="identity-note"
                            name="note"
                            label="Note to the owner"
                            hint="Needed when rejecting, so they know what to send instead. The owner sees it."
                        />
                        <p className="text-xs text-muted-foreground">
                            Verifying deletes the number and the photo. Write anything you need to remember in the identity checkpoint&apos;s
                            internal note first.
                        </p>
                    </ActionForm>
                </details>
            </div>
        )
    }

    if (identity.verification_status === "verified" && identity.has_photo) {
        return (
            <div className="mt-4 grid gap-2">
                <p className="text-sm text-warning">The document is verified, but its photo hasn&apos;t been deleted yet.</p>
                <ActionForm action={retryIdentityPhotoDeletion.bind(null, profileId)} submitLabel="Delete the photo" variant="outline" />
            </div>
        )
    }

    if (identity.verification_status === "rejected" && identity.review_note) {
        return <p className="mt-4 text-xs text-muted-foreground">Owner sees: {identity.review_note}</p>
    }

    return null
}

// What the admin can do with the property as a whole in its current status
function StatusActions({
    property,
    requests,
    documents,
    identityStatus,
    blocked,
}: {
    property: PropertyForReview["property"]
    requests: PropertyForReview["requests"]
    documents: PropertyForReview["documents"]
    identityStatus: IdentityStatus
    blocked: boolean
}) {
    const identityVerified = identityStatus === "verified"
    if (property.status === "submitted") {
        return <ActionForm action={startReview.bind(null, property.id)} submitLabel="Start review" />
    }

    if (property.status === "under_review") {
        return (
            <div className="grid gap-3">
                <ActionForm action={approveProperty.bind(null, property.id)} submitLabel="Approve" disabled={blocked} />
                <details>
                    <summary className="cursor-pointer text-sm text-primary">Ask the owner for documents</summary>
                    <ActionForm
                        action={requestChanges.bind(null, property.id)}
                        submitLabel="Send request"
                        variant="outline"
                        className="mt-3"
                    >
                        <RequestItems offerIdentity={!identityVerified} />
                        <NoteField
                            id="changes-message"
                            name="message"
                            label="Message to the owner (optional)"
                            hint="Shown above the list. Leave it empty and they see: “We need a few more things before we can carry on checking your property. Everything we need is listed below.”"
                        />
                    </ActionForm>
                </details>
            </div>
        )
    }

    if (property.status === "action_required") {
        // What was asked for, ticked off as it arrives; the same rule the owner's page uses
        const checklist = changeRequestChecklist({
            openRequests: requests.filter((request) => request.fulfilled_at === null),
            documents,
            identityRequested: property.identity_requested,
            identityStatus,
        })
        return (
            <div className="grid gap-3 text-sm">
                <p className="font-medium">Waiting on the owner</p>
                {property.changes_requested_message ? (
                    <p className="rounded-lg bg-muted/50 p-2.5 text-copy">{property.changes_requested_message}</p>
                ) : null}
                <ul className="grid gap-2">
                    {checklist.items.map((item) => (
                        <li key={item.kind === "document" ? item.id : "identity"} className="flex gap-2">
                            <ChecklistMark done={item.done} className="size-4" />
                            <span className="min-w-0">
                                {item.kind === "document" ? (
                                    <>
                                        {DOCUMENT_SLOT_OPTIONS.find((option) => option.value === item.slot)?.title ?? item.slot}
                                        <span className="text-muted-foreground">: {item.done ? "uploaded" : item.note}</span>
                                    </>
                                ) : (
                                    <>
                                        Identity document
                                        <span className="text-muted-foreground">
                                            : {identityStatus === "verified"
                                                ? "verified"
                                                : identityStatus === "unreviewed"
                                                  ? "sent, review it under Owner and identity"
                                                  : identityStatus === "rejected"
                                                    ? "rejected, waiting for a new one"
                                                    : "not added yet"}
                                        </span>
                                    </>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
                <p className={checklist.complete ? "text-success" : "text-copy"}>
                    {checklist.complete
                        ? "Everything asked for has arrived. The owner still has to press “Send back for review” before you can carry on."
                        : "The owner sends it back once everything is in. You can review their identity document meanwhile."}
                </p>
            </div>
        )
    }

    if (property.status === "active") {
        return (
            <div className="grid gap-3 text-sm">
                <p className="text-copy">Live, and shown as verified. Pausing it takes it out of the public listing until it is reviewed again.</p>
                {/* Expiring is a suspension with this reason (docs/admin.md, section 5, "Expiring a property") */}
                <ActionForm action={suspendProperty.bind(null, property.id)} submitLabel="Expire" variant="outline">
                    <input type="hidden" name="reason" value="Verification expired" />
                </ActionForm>
                <details className="border-t border-border pt-3">
                    <summary className="cursor-pointer text-destructive">Suspend for another reason</summary>
                    <ActionForm
                        action={suspendProperty.bind(null, property.id)}
                        submitLabel="Suspend"
                        variant="destructive"
                        className="mt-3"
                    >
                        <NoteField
                            id="suspension-reason"
                            name="reason"
                            label="Reason"
                            hint="Shown to the owner after “Your property’s verification is paused”."
                        />
                    </ActionForm>
                </details>
            </div>
        )
    }

    if (property.status === "suspended") {
        return (
            <div className="grid gap-3 text-sm">
                <p>
                    <span className="text-muted-foreground">Suspended:</span> {property.suspension_reason ?? "—"}
                </p>
                <details>
                    <summary className="cursor-pointer text-primary">Reopen the review</summary>
                    <ActionForm action={reopenReview.bind(null, property.id)} submitLabel="Reopen review" className="mt-3">
                        <fieldset className="grid gap-1.5">
                            <legend className="font-medium">Checkpoints to check again</legend>
                            {CHECKPOINT_KEYS.map((key) => (
                                <label key={key} className="flex items-center gap-2">
                                    <input type="checkbox" name="checkpoints" value={key} className="size-4 accent-primary" />
                                    {labelFor(CHECKPOINT_LABELS, key)}
                                </label>
                            ))}
                        </fieldset>
                        <NoteField id="reopen-note" name="note" label="Why" hint="Internal; the owner sees the property in review." />
                    </ActionForm>
                </details>
            </div>
        )
    }

    return null
}

function PropertyMap({ review }: { review: PropertyForReview }) {
    const boundary = review.property.property_boundaries?.boundary_geojson ?? null
    if (!boundary) {
        return <Empty>The owner hasn&apos;t marked the property on the map.</Empty>
    }

    // The key goes to the browser, so it is restricted to the app's domains in Google Cloud
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
        return <Empty>The map isn&apos;t set up here (no GOOGLE_MAPS_API_KEY).</Empty>
    }

    const overlaps = review.overlaps.map((overlap) => overlap.otherBoundary).filter((shape) => shape !== null)

    return (
        <div className="grid gap-2">
            <BoundaryMap apiKey={apiKey} boundary={boundary} overlaps={overlaps} />
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-sm bg-[#4C8BF5]" />
                    This property
                </span>
                {overlaps.length > 0 ? (
                    <span className="flex items-center gap-1.5">
                        <span aria-hidden className="size-2.5 rounded-sm bg-[#E53935]" />
                        Overlapping {overlaps.length === 1 ? "property" : `properties (${overlaps.length})`}
                    </span>
                ) : null}
            </p>
        </div>
    )
}

// One part of the evidence. The id is what the decision panel links to; scroll-mt keeps the title clear of the
// sticky header when a link jumps here.
function Section({ id, title, meta, children }: { id: string; title: string; meta?: string; children: React.ReactNode }) {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 rounded-xl border border-border bg-card shadow-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`${id}-title`} className="text-eyebrow text-muted-foreground">
                    {title}
                </h2>
                {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
            </div>
            {children}
        </section>
    )
}

function Fields({ rows }: { rows: [string, string | null | undefined][] }) {
    return (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
            {rows.map(([label, value]) => (
                <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-foreground">{value || "—"}</dd>
                </div>
            ))}
        </dl>
    )
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-muted-foreground">{children}</p>
}

// The same tones as the homepage's StatusBadge (app/(public)/_components/property-record.tsx)
const CHECKPOINT_STATUS_STYLES: Record<string, { icon: LucideIcon; className: string }> = {
    unverified: { icon: CircleDashed, className: "bg-background text-copy ring-1 ring-border" },
    submitted: { icon: Inbox, className: "bg-primary/10 text-primary dark:bg-primary/20" },
    in_progress: { icon: Clock, className: "bg-warning-soft text-warning" },
    verified: { icon: Check, className: "bg-success-soft text-success" },
    flagged: { icon: TriangleAlert, className: "bg-destructive/10 text-destructive dark:bg-destructive/20" },
    waived: { icon: CircleMinus, className: "bg-muted text-muted-foreground ring-1 ring-border" },
}

// Status is carried by the icon and label as well as the colour
function CheckpointStatus({ status }: { status: string }) {
    const { icon: Icon, className } = CHECKPOINT_STATUS_STYLES[status] ?? CHECKPOINT_STATUS_STYLES.unverified

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                className
            )}
        >
            <Icon size={12} strokeWidth={2.5} aria-hidden />
            {labelFor(CHECKPOINT_STATUS_LABELS, status)}
        </span>
    )
}

// editable only offers the form; update_checkpoint refuses changes outside review all the same
function Checkpoints({
    checkpoints,
    propertyId,
    editable,
}: {
    checkpoints: PropertyForReview["checkpoints"]
    propertyId: string
    editable: boolean
}) {
    if (checkpoints.length === 0) {
        return <Empty>Created when the review starts.</Empty>
    }

    // In the order the console defines, not the order the database returns
    const order = Object.keys(CHECKPOINT_LABELS)
    const sorted = [...checkpoints].sort((a, b) => order.indexOf(a.checkpoint_key) - order.indexOf(b.checkpoint_key))

    return (
        <ul className="divide-y divide-border">
            {sorted.map((checkpoint) => (
                <li
                    key={checkpoint.checkpoint_key}
                    id={checkpointAnchor(checkpoint.checkpoint_key)}
                    className="scroll-mt-20 py-3 first:pt-0 last:pb-0"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{labelFor(CHECKPOINT_LABELS, checkpoint.checkpoint_key)}</span>
                        <CheckpointStatus status={checkpoint.status} />
                    </div>
                    {checkpoint.verifier ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                            Verified by {checkpoint.verifier.full_name} on {formatDate(checkpoint.verified_at)}
                        </p>
                    ) : null}
                    {checkpoint.public_notes ? (
                        <p className="mt-1 text-sm text-copy">Owner sees: {checkpoint.public_notes}</p>
                    ) : null}
                    {checkpoint.internal_notes ? (
                        <p className="mt-1 text-sm text-copy">Internal: {checkpoint.internal_notes}</p>
                    ) : null}
                    {editable ? (
                        <CheckpointForm
                            checkpointKey={checkpoint.checkpoint_key}
                            status={checkpoint.status}
                            publicNotes={checkpoint.public_notes}
                            internalNotes={checkpoint.internal_notes}
                            action={updateCheckpoint.bind(null, propertyId, checkpoint.checkpoint_key)}
                        />
                    ) : null}
                </li>
            ))}
        </ul>
    )
}

function Documents({ documents, editable }: { documents: PropertyForReview["documents"]; editable: boolean }) {
    if (documents.length === 0) {
        return <Empty>No documents uploaded.</Empty>
    }

    const typeLabel = (value: string | null) =>
        value ? (DOCUMENT_TYPE_LABELS as Record<string, string>)[value] ?? value : "—"

    return (
        <ul className="divide-y divide-border">
            {documents.map((document) => (
                <li key={document.id} className="py-3 first:pt-0 last:pb-0">
                    {/* The name takes what's left beside the status, and wraps inside it */}
                    <div className="flex items-start justify-between gap-3">
                        <DocumentViewer fileName={document.file_name} open={openPropertyDocument.bind(null, document.id)} />
                        <DocumentStatus status={document.verification_status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {DOCUMENT_SLOT_OPTIONS.find((option) => option.value === document.slot)?.title ?? "No checklist item"} · Owner
                        says {typeLabel(document.declared_type)} · Final type{" "}
                        {document.document_type === "other" ? "not set" : typeLabel(document.document_type)}
                    </p>
                    {document.review_note ? <p className="mt-1 text-sm text-copy">Owner sees: {document.review_note}</p> : null}
                    {editable ? (
                        <details className="mt-2">
                            <summary className="cursor-pointer text-sm text-primary">Review</summary>
                            <ActionForm action={reviewDocument.bind(null, document.id)} submitLabel="Save" className="mt-3">
                                <ChoiceField
                                    id={`document-${document.id}-type`}
                                    name="document_type"
                                    label="Final type"
                                    options={DOCUMENT_TYPE_LABELS}
                                    defaultValue={document.document_type ?? document.declared_type}
                                />
                                <ChoiceField
                                    id={`document-${document.id}-status`}
                                    name="status"
                                    label="Outcome"
                                    options={pick(DOCUMENT_STATUS_LABELS, DOCUMENT_OUTCOMES)}
                                    defaultValue={document.verification_status}
                                />
                                <NoteField
                                    id={`document-${document.id}-note`}
                                    name="note"
                                    label="Owner sees"
                                    hint="Needed to reject it: say what to send instead."
                                    defaultValue={document.review_note}
                                />
                            </ActionForm>
                        </details>
                    ) : null}
                </li>
            ))}
        </ul>
    )
}

// A document's outcome, in the checkpoints' tones: waiting, accepted, rejected or replaced
const DOCUMENT_STATUS_TONES: Record<string, string> = {
    unreviewed: "in_progress",
    accepted: "verified",
    rejected: "flagged",
    superseded: "waived",
}

function DocumentStatus({ status }: { status: string }) {
    const { icon: Icon, className } = CHECKPOINT_STATUS_STYLES[DOCUMENT_STATUS_TONES[status] ?? "unverified"]

    return (
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>
            <Icon size={12} strokeWidth={2.5} aria-hidden />
            {labelFor(DOCUMENT_STATUS_LABELS, status)}
        </span>
    )
}

// Encumbrances can be recorded on any submitted property, active ones included (docs/admin.md, section 5)
function Encumbrances({
    encumbrances,
    propertyId,
}: {
    encumbrances: PropertyForReview["encumbrances"]
    propertyId: string
}) {
    return (
        <div className="grid gap-4">
            {encumbrances.length === 0 ? (
                <Empty>None recorded.</Empty>
            ) : (
                <ul className="divide-y divide-border">
                    {encumbrances.map((encumbrance) => (
                        <li key={encumbrance.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{labelFor(ENCUMBRANCE_KIND_LABELS, encumbrance.kind)}</span>
                                <span className="text-data text-sm text-muted-foreground">{encumbrance.reference}</span>
                                <Badge variant="outline">{encumbrance.status === "open" ? "Open" : "Resolved"}</Badge>
                                {encumbrance.blocks_activation && encumbrance.status === "open" ? (
                                    <Badge variant="destructive">Blocks activation</Badge>
                                ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Recorded by {encumbrance.recorder?.full_name ?? "an admin"} on {formatDate(encumbrance.created_at)}
                                {encumbrance.resolved_at ? `, resolved ${formatDate(encumbrance.resolved_at)}` : ""}
                            </p>
                            {encumbrance.internal_notes ? (
                                <p className="mt-1 text-sm text-copy">Internal: {encumbrance.internal_notes}</p>
                            ) : null}
                            <details className="mt-2">
                                <summary className="cursor-pointer text-sm text-primary">Change</summary>
                                <ActionForm
                                    action={updateEncumbrance.bind(null, encumbrance.id)}
                                    submitLabel="Save"
                                    className="mt-3"
                                >
                                    <YesNoField
                                        name="blocks_activation"
                                        legend="Blocks activation"
                                        defaultValue={encumbrance.blocks_activation}
                                    />
                                    <ChoiceField
                                        id={`encumbrance-${encumbrance.id}-status`}
                                        name="status"
                                        label="Status"
                                        options={{ open: "Open", resolved: "Resolved" }}
                                        defaultValue={encumbrance.status}
                                    />
                                    <NoteField
                                        id={`encumbrance-${encumbrance.id}-note`}
                                        name="note"
                                        label="Reason for the change"
                                        hint="Required. Internal; it goes in the history."
                                    />
                                </ActionForm>
                            </details>
                        </li>
                    ))}
                </ul>
            )}
            <details>
                <summary className="cursor-pointer text-sm text-primary">Record an encumbrance</summary>
                <ActionForm action={recordEncumbrance.bind(null, propertyId)} submitLabel="Record" className="mt-3">
                    <ChoiceField
                        id="encumbrance-kind"
                        name="kind"
                        label="Kind"
                        options={pick(ENCUMBRANCE_KIND_LABELS, ENCUMBRANCE_KINDS)}
                    />
                    <TextField
                        id="encumbrance-reference"
                        name="reference"
                        label="Suit number or registry reference"
                        maxLength={MAX_ENCUMBRANCE_REFERENCE_LENGTH}
                    />
                    {/* No default: the admin decides for each record (docs/admin.md, decision 18) */}
                    <YesNoField name="blocks_activation" legend="Blocks activation" />
                    <NoteField id="encumbrance-note" name="note" label="Internal note" />
                </ActionForm>
            </details>
        </div>
    )
}

function Overlaps({ overlaps }: { overlaps: PropertyForReview["overlaps"] }) {
    if (overlaps.length === 0) {
        return <Empty>No overlaps with submitted properties.</Empty>
    }

    return (
        <ul className="divide-y divide-border">
            {overlaps.map((overlap) => (
                <li key={overlap.id} className="py-3 text-sm first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <Link href={`/admin/properties/${overlap.otherPropertyId}`} className="text-primary hover:underline">
                            Other property
                        </Link>
                        <span>
                            {overlap.overlap_area_sqm !== null
                                ? `${Math.round(overlap.overlap_area_sqm).toLocaleString("en-GB")} m²`
                                : "Area unknown"}
                            {overlap.overlap_percentage_subject !== null
                                ? ` (${Number(overlap.overlap_percentage_subject).toFixed(1)}%)`
                                : ""}
                        </span>
                        <Badge variant={overlap.status === "detected" ? "destructive" : "outline"}>
                            {labelFor(OVERLAP_STATUS_LABELS, overlap.status)}
                        </Badge>
                        <span className="text-muted-foreground">{formatDate(overlap.created_at)}</span>
                    </div>
                    <details className="mt-2">
                        <summary className="cursor-pointer text-primary">Update</summary>
                        <ActionForm action={resolveOverlap.bind(null, overlap.id)} submitLabel="Save" className="mt-3">
                            <ChoiceField
                                id={`overlap-${overlap.id}-status`}
                                name="status"
                                label="What you found"
                                options={pick(OVERLAP_STATUS_LABELS, OVERLAP_OUTCOMES)}
                                defaultValue={overlap.status}
                            />
                            <NoteField
                                id={`overlap-${overlap.id}-note`}
                                name="note"
                                label="Internal note"
                                hint="Needed to resolve it. Both properties' histories show it; owners never do."
                            />
                        </ActionForm>
                    </details>
                </li>
            ))}
        </ul>
    )
}

// The owner's answers as resubmit_property names them (property_answers in the database)
const CHANGED_FIELD_LABELS: Record<string, string> = {
    name: "name",
    property_type: "type",
    description: "description",
    size_value: "size",
    size_unit: "size unit",
    region: "region",
    district_municipality: "district",
    city_town: "city or town",
    address: "address",
    digital_address: "digital address",
    landmark: "landmark",
    acquisition_method: "how they got it",
    acquisition_metadata: "details of how they got it",
    boundary: "boundary",
    boundary_source: "how the boundary was made",
}

// The details worth showing for each kind of entry; the owner's declaration is long and left out
function describe(entry: PropertyForReview["history"][number]) {
    const metadata = entry.metadata ?? {}
    if (entry.action === "checkpoint_updated") {
        return `${labelFor(CHECKPOINT_LABELS, metadata.checkpoint_key as string)}: ${labelFor(
            CHECKPOINT_STATUS_LABELS,
            metadata.old_status as string
        )} → ${labelFor(CHECKPOINT_STATUS_LABELS, metadata.new_status as string)}`
    }
    if (entry.action === "encumbrance_recorded") {
        return `${labelFor(ENCUMBRANCE_KIND_LABELS, metadata.kind as string)}${metadata.blocks_activation ? ", blocks activation" : ""}`
    }
    if ((entry.action === "encumbrance_updated" || entry.action === "property_suspended") && typeof metadata.reason === "string") {
        return metadata.reason
    }
    if (entry.action === "overlap_updated") {
        return `${labelFor(OVERLAP_STATUS_LABELS, metadata.old_status as string)} → ${labelFor(
            OVERLAP_STATUS_LABELS,
            metadata.new_status as string
        )}${typeof metadata.note === "string" ? `: ${metadata.note}` : ""}`
    }
    if (entry.action === "review_reopened" && typeof metadata.note === "string") {
        return metadata.note
    }
    if (entry.action === "changes_requested" && typeof metadata.message === "string") {
        return metadata.message
    }
    // What to look at again: the answers the owner changed, by name (never their values)
    if (entry.action === "property_resubmitted" && Array.isArray(metadata.changed_fields)) {
        return metadata.changed_fields.length > 0
            ? `Changed: ${(metadata.changed_fields as string[]).map((field) => CHANGED_FIELD_LABELS[field] ?? field).join(", ")}`
            : "No answers changed"
    }
    return null
}

// Newest first; the latest few are shown, the rest folded away
const LATEST_HISTORY = 5

function History({ history }: { history: PropertyForReview["history"] }) {
    if (history.length === 0) {
        return <Empty>Nothing recorded yet.</Empty>
    }

    const older = history.slice(LATEST_HISTORY)

    return (
        <div className="grid gap-3">
            <ol className="space-y-3 text-sm">
                {history.slice(0, LATEST_HISTORY).map((entry) => (
                    <HistoryEntry key={entry.id} entry={entry} />
                ))}
            </ol>
            {older.length > 0 ? (
                <details>
                    <summary className="cursor-pointer text-sm text-primary">
                        Show {older.length} older {older.length === 1 ? "entry" : "entries"}
                    </summary>
                    <ol className="mt-3 space-y-3 text-sm">
                        {older.map((entry) => (
                            <HistoryEntry key={entry.id} entry={entry} />
                        ))}
                    </ol>
                </details>
            ) : null}
        </div>
    )
}

function HistoryEntry({ entry }: { entry: PropertyForReview["history"][number] }) {
    const detail = describe(entry)
    return (
        <li>
            <div className="flex flex-wrap gap-x-2">
                <span className="font-medium">{labelFor(AUDIT_ACTION_LABELS, entry.action)}</span>
                <span className="text-muted-foreground">
                    {entry.actor?.full_name ?? "System"} · {dateTimeFormat.format(new Date(entry.created_at))}
                </span>
            </div>
            {detail ? <p className="text-copy">{detail}</p> : null}
        </li>
    )
}
