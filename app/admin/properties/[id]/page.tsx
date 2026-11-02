import { Check, CircleDashed, CircleMinus, Clock, Inbox, TriangleAlert, type LucideIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

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

import { ActionForm } from "./action-form"
import {
    approveProperty,
    classifyProperty,
    recordEncumbrance,
    reopenReview,
    resolveOverlap,
    reviewDocument,
    startReview,
    suspendProperty,
    updateCheckpoint,
    updateEncumbrance,
} from "./actions"
import { CheckpointForm } from "./checkpoint-form"
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

    return (
        <div className="space-y-8">
            <header>
                <Link href="/admin" className="text-sm text-copy hover:text-primary">
                    ← Review queue
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h1 className="text-heading text-primary">{property.name ?? "Untitled property"}</h1>
                    <Badge variant="outline">{labelFor(PROPERTY_STATUS_LABELS, property.status)}</Badge>
                </div>
                <p className="text-data mt-1 text-sm text-muted-foreground">{property.prop_id}</p>
                <div className="mt-4">
                    <StatusActions property={property} blockers={review.blockers} />
                </div>
            </header>

            <Section title="Owner">
                <Fields
                    rows={[
                        ["Name", property.owner?.full_name],
                        ["Phone", property.owner?.phone_number],
                        ["Identity document", review.identity ? labelFor(IDENTITY_DOCUMENT_LABELS, review.identity.document_type) : "None saved"],
                        ["Identity status", review.identity ? labelFor(IDENTITY_STATUS_LABELS, review.identity.verification_status) : "—"],
                        ["Issued by", review.identity?.issuing_country],
                        ["Expires", review.identity ? formatDate(review.identity.expires_on) : null],
                    ]}
                />
            </Section>

            <Section title="The owner's answers">
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

            <Section title="Checkpoints">
                <Checkpoints
                    checkpoints={review.checkpoints}
                    propertyId={property.id}
                    editable={property.status === "under_review"}
                />
            </Section>

            <Section title="Documents">
                <Documents documents={review.documents} editable={property.status === "under_review"} />
            </Section>

            <Section title="Encumbrances">
                <Encumbrances encumbrances={review.encumbrances} propertyId={property.id} />
            </Section>

            <Section title="Overlaps">
                <Overlaps overlaps={review.overlaps} />
            </Section>

            <Section title="History">
                <History history={review.history} />
            </Section>
        </div>
    )
}

// What the admin can do with the property as a whole in its current status
function StatusActions({ property, blockers }: { property: PropertyForReview["property"]; blockers: string[] }) {
    if (property.status === "submitted") {
        return <ActionForm action={startReview.bind(null, property.id)} submitLabel="Start review" />
    }

    if (property.status === "under_review") {
        return (
            <div className="grid gap-2">
                {blockers.length > 0 ? (
                    <div className="text-sm">
                        <p className="font-medium">Before it can be approved:</p>
                        <ul className="mt-1 list-disc pl-5 text-copy">
                            {blockers.map((blocker) => (
                                <li key={blocker}>{blocker}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                <ActionForm
                    action={approveProperty.bind(null, property.id)}
                    submitLabel="Approve"
                    disabled={blockers.length > 0}
                />
            </div>
        )
    }

    if (property.status === "active") {
        return (
            <div className="grid gap-3">
                {/* Expiring is a suspension with this reason (docs/admin.md, section 5, "Expiring a property") */}
                <ActionForm action={suspendProperty.bind(null, property.id)} submitLabel="Expire" variant="outline">
                    <input type="hidden" name="reason" value="Verification expired" />
                </ActionForm>
                <details>
                    <summary className="cursor-pointer text-sm text-primary">Suspend for another reason</summary>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-eyebrow mb-3 text-muted-foreground">{title}</h2>
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
                <li key={checkpoint.checkpoint_key} className="py-3 first:pt-0 last:pb-0">
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
        <div className="grid gap-4">
            <div className="overflow-x-auto">
                <table className="w-full min-w-xl text-left text-sm">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="pb-2 font-normal">File</th>
                            <th className="pb-2 font-normal">Checklist item</th>
                            <th className="pb-2 font-normal">Owner says</th>
                            <th className="pb-2 font-normal">Final type</th>
                            <th className="pb-2 font-normal">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {documents.map((document) => (
                            <tr key={document.id}>
                                {/* Opening files waits for the document safety step (docs/admin.md, section 7) */}
                                <td className="py-2 pr-3 break-all">{document.file_name}</td>
                                <td className="py-2 pr-3">
                                    {DOCUMENT_SLOT_OPTIONS.find((option) => option.value === document.slot)?.title ?? "—"}
                                </td>
                                <td className="py-2 pr-3">{typeLabel(document.declared_type)}</td>
                                <td className="py-2 pr-3">
                                    {document.document_type === "other" ? "Not set" : typeLabel(document.document_type)}
                                </td>
                                <td className="py-2">
                                    {labelFor(DOCUMENT_STATUS_LABELS, document.verification_status)}
                                    {document.review_note ? (
                                        <p className="text-xs text-muted-foreground">Owner sees: {document.review_note}</p>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Below the table rather than in it, so each form has the page's width */}
            {editable
                ? documents.map((document) => (
                      <details key={document.id}>
                          <summary className="cursor-pointer text-sm text-primary break-all">Review {document.file_name}</summary>
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
                  ))
                : null}
        </div>
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
    return null
}

function History({ history }: { history: PropertyForReview["history"] }) {
    if (history.length === 0) {
        return <Empty>Nothing recorded yet.</Empty>
    }

    return (
        <ol className="space-y-3 text-sm">
            {history.map((entry) => {
                const detail = describe(entry)
                return (
                    <li key={entry.id}>
                        <div className="flex flex-wrap gap-x-2">
                            <span className="font-medium">{labelFor(AUDIT_ACTION_LABELS, entry.action)}</span>
                            <span className="text-muted-foreground">
                                {entry.actor?.full_name ?? "System"} · {dateTimeFormat.format(new Date(entry.created_at))}
                            </span>
                        </div>
                        {detail ? <p className="text-copy">{detail}</p> : null}
                    </li>
                )
            })}
        </ol>
    )
}
