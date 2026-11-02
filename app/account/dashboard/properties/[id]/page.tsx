import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { ActionForm } from "@/components/action-form"
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

            {property.status === "action_required" ? (
                <section className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
                    {property.changes_requested_message ? <p>{property.changes_requested_message}</p> : null}

                    {property.openRequests.length > 0 ? (
                        <ul className="grid gap-4">
                            {property.openRequests.map((request) => {
                                const slot = documentSlotSchema.parse(request.slot)
                                return (
                                    <li key={request.id} className="grid gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
                                        <p className="font-medium">
                                            {DOCUMENT_SLOT_OPTIONS.find((option) => option.value === slot)?.title ?? slot}
                                        </p>
                                        <p className="text-sm text-copy">{request.note}</p>
                                        <RequestUpload
                                            propertyId={property.id}
                                            slot={slot}
                                            uploads={property.uploads.filter((upload) => upload.slot === slot)}
                                        />
                                    </li>
                                )
                            })}
                        </ul>
                    ) : null}

                    {/* /account/identity comes with build step 6; until then the console doesn't ask for it */}
                    {property.identity_requested ? (
                        <p className="text-sm text-copy">We also need your identity document. Contact us and we&apos;ll help you add it.</p>
                    ) : null}

                    <ActionForm action={resubmitProperty.bind(null, property.id)} submitLabel="Send back for review" />
                </section>
            ) : null}
        </main>
    )
}
