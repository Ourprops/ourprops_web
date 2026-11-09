import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { CircleCheck } from "lucide-react"

import { ActionForm } from "@/components/action-form"
import { ChecklistMark } from "@/components/checklist-mark"
import { buttonVariants } from "@/components/ui/button"
import { changeRequestChecklist } from "@/lib/change-requests"
import { getOwnIdentityDocument } from "@/lib/supabase/identity-documents"
import { OWNER_STATUS_LABELS, getOwnProperty } from "@/lib/supabase/owner-properties"
import { createClient } from "@/lib/supabase/server"
import { DOCUMENT_SLOT_OPTIONS } from "@/lib/types/property"
import { documentSlotSchema } from "@/lib/validators/property"

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

    return (
        <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8 sm:px-6">
            <Link href="/account/dashboard" className="text-sm text-copy hover:text-primary">
                ← Your properties
            </Link>

            <header>
                <h1 className="text-heading text-primary">{property.name ?? "Untitled property"}</h1>
                <p className="mt-1 text-copy">{OWNER_STATUS_LABELS[property.status] ?? property.status}</p>
                {property.status === "suspended" && property.suspension_reason ? (
                    <p className="mt-1 text-copy">{property.suspension_reason}</p>
                ) : null}
            </header>

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
        </main>
    )
}
