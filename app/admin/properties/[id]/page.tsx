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
    PROPERTY_STATUS_LABELS,
    labelFor,
} from "@/lib/admin/labels"
import { getPropertyForReview, type PropertyForReview } from "@/lib/admin/review"
import { requireAdmin } from "@/lib/auth/staff"
import { ACQUISITION_OPTIONS, DOCUMENT_SLOT_OPTIONS, DOCUMENT_TYPE_LABELS, TYPE_OPTIONS } from "@/lib/types/property"

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

// Read-only for now: the review actions come with the next step of the build order (docs/admin.md, section 9)
// TODO: wire "Start review" and the checkpoint controls to start_review and update_checkpoint as server actions.
// Each action calls requireAdmin() itself: a server action is a public endpoint, whatever page shows its button.
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
                        ["Ownership type", property.ownership_type ?? "Not classified yet"],
                        ["Ownership structure", property.ownership_structure ?? "Not classified yet"],
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
            </Section>

            <Section title="Checkpoints">
                <Checkpoints checkpoints={review.checkpoints} />
            </Section>

            <Section title="Documents">
                <Documents documents={review.documents} />
            </Section>

            <Section title="Encumbrances">
                <Encumbrances encumbrances={review.encumbrances} />
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

function Checkpoints({ checkpoints }: { checkpoints: PropertyForReview["checkpoints"] }) {
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
                        <Badge variant={checkpoint.status === "flagged" ? "destructive" : "outline"}>
                            {labelFor(CHECKPOINT_STATUS_LABELS, checkpoint.status)}
                        </Badge>
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
                </li>
            ))}
        </ul>
    )
}

function Documents({ documents }: { documents: PropertyForReview["documents"] }) {
    if (documents.length === 0) {
        return <Empty>No documents uploaded.</Empty>
    }

    const typeLabel = (value: string | null) =>
        value ? (DOCUMENT_TYPE_LABELS as Record<string, string>)[value] ?? value : "—"

    return (
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
                            <td className="py-2 pr-3">{document.document_type === "other" ? "Not set" : typeLabel(document.document_type)}</td>
                            <td className="py-2">{labelFor(DOCUMENT_STATUS_LABELS, document.verification_status)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function Encumbrances({ encumbrances }: { encumbrances: PropertyForReview["encumbrances"] }) {
    if (encumbrances.length === 0) {
        return <Empty>None recorded.</Empty>
    }

    return (
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
                </li>
            ))}
        </ul>
    )
}

function Overlaps({ overlaps }: { overlaps: PropertyForReview["overlaps"] }) {
    if (overlaps.length === 0) {
        return <Empty>No overlaps with submitted properties.</Empty>
    }

    return (
        <ul className="divide-y divide-border">
            {overlaps.map((overlap) => (
                <li key={overlap.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm first:pt-0 last:pb-0">
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
    if (entry.action === "encumbrance_updated" && typeof metadata.reason === "string") {
        return metadata.reason
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
