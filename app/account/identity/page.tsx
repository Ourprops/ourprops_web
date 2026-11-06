import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getOwnIdentityDocument } from "@/lib/supabase/identity-documents"
import { createClient } from "@/lib/supabase/server"
import { IDENTITY_DOCUMENT_TYPES } from "@/lib/validators/identity"

import { IdentityForm } from "./identity-form"

export const metadata: Metadata = {
    title: "Verify your identity",
}

// A date with no time, so it is read and shown in UTC and never shifts a day
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

// Where an owner adds the identity document every property they register relies on (docs/admin.md, section 5).
// Done once, not per property. The proxy sends signed-out visitors to log in and asks for an authenticator code first.
export default async function IdentityPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const profileId = data?.claims?.sub
    if (!profileId) redirect("/account/login")

    const document = await getOwnIdentityDocument(supabase, profileId)

    return (
        <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8 sm:px-6">
            <Link href="/account/dashboard" className="w-fit text-sm text-primary hover:underline">
                Back to your properties
            </Link>
            <div className="grid gap-2">
                <h1 className="text-heading text-primary">Verify your identity</h1>
                <p className="text-copy">
                    Before a property goes live, we check that the person registering it is who they say they are. Add your Ghana Card,
                    or your passport if you live abroad and don&apos;t have one. You only do this once, for all your properties.
                </p>
            </div>

            {document?.verification_status === "verified" ? (
                <section className="grid gap-1 rounded-xl border border-border bg-card p-4">
                    <p className="font-medium">Your identity is verified.</p>
                    <p className="text-sm text-copy">
                        We checked your {IDENTITY_DOCUMENT_TYPES[document.document_type]} and deleted the photo and the number. To change
                        it, contact us.
                    </p>
                </section>
            ) : (
                <>
                    {document?.verification_status === "unreviewed" ? (
                        <section className="grid gap-1 rounded-xl border border-border bg-card p-4">
                            <p className="font-medium">We&apos;re checking your {IDENTITY_DOCUMENT_TYPES[document.document_type]}.</p>
                            <p className="text-sm text-copy">
                                It expires on {dateFormat.format(new Date(document.expires_on))}. You don&apos;t need to do anything. If you
                                sent the wrong document, add the right one below and we&apos;ll check that instead.
                            </p>
                        </section>
                    ) : null}
                    {document?.verification_status === "rejected" ? (
                        <section className="grid gap-1 rounded-xl border border-warning bg-card p-4">
                            <p className="font-medium">We couldn&apos;t accept your {IDENTITY_DOCUMENT_TYPES[document.document_type]}.</p>
                            {document.review_note ? <p className="text-sm text-copy">{document.review_note}</p> : null}
                            <p className="text-sm text-copy">Add it again below.</p>
                        </section>
                    ) : null}

                    <section className="grid gap-4 rounded-xl border border-border bg-card p-4">
                        <IdentityForm profileId={profileId} />
                        <p className="text-xs text-muted-foreground">
                            Only our verification team sees your document. Once it is verified, we delete the photo and the number and keep
                            only the type of document, the country, the expiry date and when we checked it.
                        </p>
                    </section>
                </>
            )}
        </main>
    )
}
