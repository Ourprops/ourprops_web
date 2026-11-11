import type { Metadata } from "next"
import { BadgeCheck, CircleCheck, LockKeyhole } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { OwnerShell } from "@/components/owner/owner-shell"
import { buttonVariants } from "@/components/ui/button"
import { getOwnIdentityDocument } from "@/lib/supabase/identity-documents"
import { getOwnProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"
import { IDENTITY_DOCUMENT_TYPES } from "@/lib/validators/identity"

import { IdentityForm } from "./identity-form"
import { IdentitySteps } from "./identity-steps"
import { ReplaceDocument } from "./replace-document"

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

    const [profile, document, waiting] = await Promise.all([
        getOwnProfile(supabase, profileId),
        getOwnIdentityDocument(supabase, profileId),
        // Properties we asked for this document for: they go back to review only when the owner sends them back
        supabase
            .from("properties")
            .select("id, name")
            .eq("submitted_by", profileId)
            .eq("status", "action_required")
            .eq("identity_requested", true)
            .then(({ data }) => (data ?? []) as { id: string; name: string | null }[]),
    ])

    return (
        <OwnerShell fullName={profile?.full_name ?? "Account"}>
            <div className="grid max-w-2xl gap-2">
                <h1 className="text-display text-primary">Verify your identity</h1>
                <p className="text-copy">
                    Before a property goes live, we check that the person registering it is who they say they are. Add your Ghana Card,
                    or your passport if you live abroad and don&apos;t have one. You only do this once, for all your properties.
                </p>
            </div>

            {document?.verification_status === "verified" ? (
                <section className="grid w-full max-w-2xl gap-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
                    <IdentitySteps status="verified" />
                    <div className="grid gap-1">
                        <p className="flex items-center gap-2 font-medium">
                            <BadgeCheck className="size-5 text-success" aria-hidden />
                            Your identity is verified
                        </p>
                        <p className="text-sm text-copy">
                            We checked your {IDENTITY_DOCUMENT_TYPES[document.document_type]}
                            {document.verified_at ? ` on ${dateFormat.format(new Date(document.verified_at))}` : ""}, then deleted
                            the photo and the number. Every property you register can now go live once it is checked. To change it,
                            contact us.
                        </p>
                    </div>
                    <NextStep waiting={waiting} />
                </section>
            ) : document?.verification_status === "unreviewed" ? (
                <>
                    <section className="grid w-full max-w-2xl gap-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6" aria-live="polite">
                        <IdentitySteps status="unreviewed" />
                        <div className="grid gap-1">
                            <p className="flex items-center gap-2 font-medium">
                                <CircleCheck className="size-5 text-success" aria-hidden />
                                Your {IDENTITY_DOCUMENT_TYPES[document.document_type]} has been sent
                            </p>
                            <p className="text-sm text-copy">
                                Our team will check it and let you know.
                                {waiting.length === 0 ? " You don't need to do anything else." : ""}
                            </p>
                        </div>
                        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                            <dt className="text-muted-foreground">Document</dt>
                            <dd>{IDENTITY_DOCUMENT_TYPES[document.document_type]}</dd>
                            {document.document_type === "passport" ? (
                                <>
                                    <dt className="text-muted-foreground">Issued by</dt>
                                    <dd>{countryName(document.issuing_country)}</dd>
                                </>
                            ) : null}
                            <dt className="text-muted-foreground">Expires</dt>
                            <dd>{dateFormat.format(new Date(document.expires_on))}</dd>
                            <dt className="text-muted-foreground">Sent</dt>
                            <dd>{dateFormat.format(new Date(document.updated_at))}</dd>
                        </dl>
                        <NextStep waiting={waiting} />
                    </section>
                    <ReplaceDocument profileId={profileId} />
                </>
            ) : (
                <>
                    {document?.verification_status === "rejected" ? (
                        <section className="grid w-full max-w-2xl gap-5 rounded-2xl border border-warning bg-card p-5 shadow-card sm:p-6">
                            <IdentitySteps status="rejected" />
                            <div className="grid gap-1">
                                <p className="font-medium">We couldn&apos;t accept your {IDENTITY_DOCUMENT_TYPES[document.document_type]}</p>
                                {document.review_note ? <p className="text-sm text-copy">{document.review_note}</p> : null}
                                <p className="text-sm text-copy">Send it again below.</p>
                            </div>
                        </section>
                    ) : null}

                    <section className="grid w-full max-w-2xl gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
                        <IdentityForm profileId={profileId} />
                    </section>
                </>
            )}

            {document?.verification_status === "verified" ? null : (
                <p className="flex max-w-2xl gap-2 text-xs text-muted-foreground">
                    <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Only our verification team sees your document. Once it is verified, we delete the photo and the number, and keep
                    only the type of document, the country, the expiry date and when we checked it.
                </p>
            )}
        </OwnerShell>
    )
}

function countryName(code: string) {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
}

// What to do now the document is in: send back any property we asked for it for, or else just go back
function NextStep({ waiting }: { waiting: { id: string; name: string | null }[] }) {
    if (waiting.length === 0) {
        return (
            <Link href="/account/dashboard" className={buttonVariants({ variant: "outline", className: "h-11 w-full sm:w-fit sm:px-6" })}>
                Back to your properties
            </Link>
        )
    }

    return (
        <div className="grid gap-2 rounded-xl border border-secondary/40 bg-secondary/8 p-4">
            <p className="text-sm font-medium">One more step</p>
            <p className="text-sm text-copy">
                {waiting.length === 1
                    ? `${waiting[0].name ?? "Your property"} is waiting for you to send it back to us.`
                    : "These properties are waiting for you to send them back to us."}
            </p>
            {waiting.map((property) => (
                <Link
                    key={property.id}
                    href={`/account/dashboard/properties/${property.id}`}
                    className={buttonVariants({ variant: "cta", className: "h-11 w-full sm:w-fit sm:px-6" })}
                >
                    {waiting.length === 1 ? "Send it back for review" : `Send back ${property.name ?? "this property"}`}
                </Link>
            ))}
        </div>
    )
}
