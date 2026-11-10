import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { BadgeCheck, Circle, CircleCheck, CircleMinus, Clock, FileText, LockKeyhole, MapPin, TriangleAlert } from "lucide-react"

import { ActionForm } from "@/components/action-form"
import { ChecklistMark } from "@/components/checklist-mark"
import { OwnerShell } from "@/components/owner/owner-shell"
import { PropertyProgress } from "@/components/owner/property-progress"
import { ShareRecord } from "@/components/owner/share-record"
import { buttonVariants } from "@/components/ui/button"
import { changeRequestChecklist } from "@/lib/change-requests"
import { getOwnIdentityDocument } from "@/lib/supabase/identity-documents"
import { STATUS_EXPLAINED } from "@/lib/owner/dashboard"
import { listRecentNotifications } from "@/lib/supabase/notifications"
import { listOwnCheckpoints, getOwnProperty, type OwnCheckpoint } from "@/lib/supabase/owner-properties"
import { CHECK_STATES, ownerChecks, type CheckState } from "@/lib/owner/checks"
import { getOwnProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"
import { supportWhatsAppUrl } from "@/lib/support"
import { DOCUMENT_SLOT_OPTIONS } from "@/lib/types/property"
import { documentSlotSchema } from "@/lib/validators/property"

import { Updates } from "../../updates"
import { resubmitProperty } from "./actions"
import { RequestUpload } from "./request-upload"

export const metadata: Metadata = {
    title: "Your property",
}

// One of the owner's properties: its status in plain words and, when we need something, what and why.
// Owners see outcomes and next steps, never internal notes or who reviewed it (docs/admin.md, section 5).
export default async function OwnPropertyPage({ params }: PageProps<"/account/dashboard/properties/[id]">) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const ownerId = data?.claims?.sub
    if (!ownerId) redirect("/account/login")

    const { id } = await params
    const property = await getOwnProperty(supabase, ownerId, id)
    if (!property) notFound()

    // A draft is still being filled in, in the registration flow
    if (property.status === "draft") redirect(`/account/dashboard/properties/new?draft=${property.id}`)

    const [profile, notifications, checkpoints] = await Promise.all([
        getOwnProfile(supabase, ownerId),
        listRecentNotifications(supabase, 5, property.id),
        listOwnCheckpoints(supabase, property.id),
    ])

    // What we asked for, ticked off as it arrives, so the last step (sending it back) is plain to see
    const checklist =
        property.status === "action_required"
            ? changeRequestChecklist({
                  openRequests: property.openRequests,
                  documents: property.documents,
                  identityRequested: property.identity_requested,
                  identityStatus: (await getOwnIdentityDocument(supabase, ownerId))?.verification_status ?? null,
              })
            : null

    const explained = STATUS_EXPLAINED[property.status] ?? { label: property.status, next: "" }
    const place = [property.city_town, property.district_municipality, property.region].filter(Boolean).join(", ")
    const decided = property.documents.filter((document) => document.verification_status !== "unreviewed").length

    return (
        <OwnerShell fullName={profile?.full_name ?? "Account"}>
            <Link href="/account/dashboard" className="w-fit text-sm text-copy hover:text-primary">
                ← Your properties
            </Link>

            <header className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="grid gap-1">
                    <h1 className="text-heading text-primary wrap-anywhere">{property.name ?? "Untitled property"}</h1>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-copy">
                        {place ? (
                            <span className="flex items-center gap-1">
                                <MapPin size={14} aria-hidden /> {place}
                            </span>
                        ) : null}
                        <span>
                            Reference <span className="text-data font-medium text-foreground">{property.prop_id}</span>
                        </span>
                    </p>
                </div>
                <PropertyProgress status={property.status} size="md" />
                <div className="grid gap-0.5">
                    <p className="font-medium">{explained.label}</p>
                    <p className="text-sm text-copy">{explained.next}</p>
                    {property.status === "suspended" && property.suspension_reason ? (
                        <p className="mt-1 rounded-lg bg-muted/50 p-3 text-sm text-copy">{property.suspension_reason}</p>
                    ) : null}
                </div>
            </header>

            {property.status === "active" ? (
                <section className="grid gap-4 rounded-xl border border-success bg-card p-4 sm:p-5">
                    <div className="grid gap-1">
                        <h2 className="flex items-center gap-2 font-medium">
                            <BadgeCheck className="size-5 text-success" aria-hidden /> Verified by OurProps
                        </h2>
                        <p className="text-sm text-copy">
                            Our team has checked the evidence for this property. Share its public record with buyers, tenants or family,
                            so they can see what we checked. Your documents stay private.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Verified is OurProps&apos; review status. It isn&apos;t a guarantee of legal title, and doesn&apos;t replace a
                            Lands Commission search or legal advice.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/record/${property.prop_id}`} className={buttonVariants({ className: "h-10" })}>
                            View public record
                        </Link>
                        <ShareRecord path={`/record/${property.prop_id}`} name={property.name ?? "My property"} />
                    </div>
                </section>
            ) : null}

            {property.status === "action_required" && checklist ? (
                <section className="grid gap-5 rounded-xl border border-warning bg-card p-4 sm:p-5">
                    <div className="grid gap-2">
                        <h2 className="font-medium">We need something from you</h2>
                        {property.changes_requested_message ? (
                            <p className="rounded-lg bg-muted/50 p-3 text-sm text-copy">{property.changes_requested_message}</p>
                        ) : null}
                    </div>

                    <ol className="grid gap-3">
                        {checklist.items.map((item) => (
                            <li key={item.kind === "document" ? item.id : "identity"} className="flex gap-3 rounded-lg border border-border p-3">
                                <ChecklistMark done={item.done} />
                                <div className="grid min-w-0 flex-1 gap-1.5">
                                    {item.kind === "document" ? (
                                        <>
                                            <p className="font-medium">
                                                {DOCUMENT_SLOT_OPTIONS.find((option) => option.value === item.slot)?.title ?? "A document"}
                                            </p>
                                            <p className="text-sm text-copy">{item.note}</p>
                                            <RequestUpload
                                                propertyId={property.id}
                                                slot={documentSlotSchema.parse(item.slot)}
                                                uploads={property.uploads.filter((upload) => upload.slot === item.slot)}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-medium">Your identity document</p>
                                            {item.status === "verified" ? (
                                                <p className="text-sm text-success">Verified. Nothing more to do here.</p>
                                            ) : item.status === "unreviewed" ? (
                                                <p className="text-sm text-copy">Sent. We&apos;re checking it.</p>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-copy">
                                                        {item.status === "rejected"
                                                            ? "We couldn't accept the one you sent. Please send it again."
                                                            : "Your Ghana Card, or your passport if you live abroad."}
                                                    </p>
                                                    <Link
                                                        href="/account/identity"
                                                        className={buttonVariants({ variant: "outline", className: "h-10 w-fit" })}
                                                    >
                                                        {item.status === "rejected" ? "Send it again" : "Add your identity document"}
                                                    </Link>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>

                    {/* The registration flow, in its changes mode: answers and boundary only */}
                    <p className="text-sm text-copy">
                        Need to correct something you told us?{" "}
                        <Link href={`/account/dashboard/properties/new?draft=${property.id}`} className="font-medium text-primary hover:underline">
                            Change your answers or boundary
                        </Link>
                    </p>

                    <div className="grid gap-3 border-t border-border pt-4">
                        <p className="text-sm">
                            {checklist.complete ? (
                                <span className="flex items-center gap-2 font-medium text-success">
                                    <CircleCheck className="size-4" aria-hidden />
                                    Everything we asked for is here. Send it back so we can carry on checking.
                                </span>
                            ) : (
                                <span className="text-copy">When everything above is done, send your property back to us.</span>
                            )}
                        </p>
                        <ActionForm action={resubmitProperty.bind(null, property.id)} submitLabel="Send back for review" />
                    </div>
                </section>
            ) : null}

            {checkpoints.length > 0 ? <WhatWeCheck checkpoints={checkpoints} /> : null}

            {property.documents.length > 0 ? (
                <section aria-labelledby="documents-title" className="grid gap-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 id="documents-title" className="font-medium">
                            Documents you sent
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {decided} of {property.documents.length} checked
                        </span>
                    </div>
                    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                        {property.documents.map((document) => (
                            <li key={document.id} className="grid gap-1 px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="flex min-w-0 items-start gap-2">
                                        <FileText size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                                        <span className="min-w-0 text-sm wrap-anywhere">{document.file_name}</span>
                                    </span>
                                    <DocumentOutcome status={document.verification_status} />
                                </div>
                                <p className="pl-6 text-xs text-muted-foreground">
                                    {DOCUMENT_SLOT_OPTIONS.find((option) => option.value === document.slot)?.title ?? "Other document"} · Sent{" "}
                                    {dateFormat.format(new Date(document.created_at))}
                                </p>
                                {document.review_note && document.verification_status !== "accepted" ? (
                                    <p className="pl-6 text-sm text-copy">{document.review_note}</p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                        <LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden />
                        Only our verification team sees these. They are never on the public record.
                    </p>
                </section>
            ) : null}

            <Updates notifications={notifications} />
        </OwnerShell>
    )
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

// A document's review, in the owner's words
const OUTCOMES: Record<string, { label: string; className: string }> = {
    unreviewed: { label: "Waiting to be checked", className: "bg-muted text-copy" },
    accepted: { label: "Accepted", className: "bg-success-soft text-success" },
    rejected: { label: "Not accepted", className: "bg-destructive/10 text-destructive" },
    superseded: { label: "Replaced", className: "bg-muted text-muted-foreground" },
}

function DocumentOutcome({ status }: { status: string }) {
    const { label, className } = OUTCOMES[status] ?? OUTCOMES.unreviewed
    return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>
}

const CHECK_STYLES: Record<CheckState, { icon: typeof BadgeCheck; className: string }> = {
    checked: { icon: BadgeCheck, className: "text-success" },
    attention: { icon: TriangleAlert, className: "text-warning" },
    checking: { icon: Clock, className: "text-primary" },
    skipped: { icon: CircleMinus, className: "text-muted-foreground" },
    not_started: { icon: Circle, className: "text-muted-foreground" },
}

// The seven checks and where each stands, so "being checked" means something, and anything that needs attention is
// seen with the note our team wrote. Shown once the review has started.
function WhatWeCheck({ checkpoints }: { checkpoints: OwnCheckpoint[] }) {
    const checks = ownerChecks(checkpoints)
    const done = checks.filter((check) => check.state === "checked" || check.state === "skipped").length
    const attention = checks.filter((check) => check.state === "attention").length

    return (
        <section aria-labelledby="checks-title" className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="checks-title" className="font-medium">
                    What we&apos;re checking
                </h2>
                <span className="text-xs text-muted-foreground">
                    {done} of {checks.length} done{attention > 0 ? ` · ${attention} needs attention` : ""}
                </span>
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {checks.map((check) => {
                    const { icon: Icon, className } = CHECK_STYLES[check.state]
                    return (
                        <li key={check.key} className={`flex gap-3 px-4 py-3 ${check.state === "attention" ? "bg-warning-soft/40" : ""}`}>
                            <Icon className={`mt-0.5 size-5 shrink-0 ${className}`} aria-hidden />
                            <span className="grid min-w-0 flex-1 gap-0.5">
                                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                                    <span className="font-medium">{check.title}</span>
                                    <span className={`text-xs ${check.state === "attention" ? "font-medium text-warning" : "text-muted-foreground"}`}>
                                        {CHECK_STATES[check.state]}
                                    </span>
                                </span>
                                {check.note ? <span className="text-sm text-copy wrap-anywhere">{check.note}</span> : null}
                            </span>
                        </li>
                    )
                })}
            </ul>
            {attention > 0 ? (
                <p className="text-xs text-muted-foreground">
                    If we need something from you to sort it out, we&apos;ll ask here. You can also{" "}
                    <a href={supportWhatsAppUrl("Hello OurProps, I have a question about a check on my property: ")} className="text-primary underline">
                        message us on WhatsApp
                    </a>
                    .
                </p>
            ) : null}
        </section>
    )
}
