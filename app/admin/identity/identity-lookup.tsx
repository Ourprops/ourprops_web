"use client"

import { useActionState, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { IDENTITY_STATUS_LABELS, labelFor } from "@/lib/admin/labels"
import { countryOptions } from "@/lib/countries"
import { IDENTITY_DOCUMENT_TYPES } from "@/lib/validators/identity"

import { findIdentityHolder, releaseIdentityDocument, type IdentityHolder } from "./actions"

type DocumentType = keyof typeof IDENTITY_DOCUMENT_TYPES

const selectClassName =
    "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-72"

// Finds the account holding a document, then releases it from that account
export function IdentityLookup() {
    const [documentType, setDocumentType] = useState<DocumentType>("ghana_card")
    const [lookup, lookUp, searching] = useActionState(findIdentityHolder, null)
    const countries = useMemo(() => countryOptions(), [])

    return (
        <div className="grid gap-6">
            <form action={lookUp} className="grid gap-4 rounded-xl border border-border bg-card p-4">
                <fieldset className="grid gap-2">
                    <legend className="mb-1 text-sm font-medium">Document</legend>
                    {Object.entries(IDENTITY_DOCUMENT_TYPES).map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name="document_type"
                                value={value}
                                checked={documentType === value}
                                onChange={() => setDocumentType(value as DocumentType)}
                            />
                            {label}
                        </label>
                    ))}
                </fieldset>
                {documentType === "passport" ? (
                    <div className="grid gap-1.5">
                        <Label htmlFor="issuing_country">Country that issued it</Label>
                        <select id="issuing_country" name="issuing_country" defaultValue="GH" className={selectClassName}>
                            {countries.map(([code, name]) => (
                                <option key={code} value={code}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}
                <div className="grid gap-1.5">
                    <Label htmlFor="document_number">Number</Label>
                    <Input id="document_number" name="document_number" required autoComplete="off" spellCheck={false} className="sm:w-72" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={searching}>
                        {searching ? <Spinner /> : null}
                        Find the account
                    </Button>
                    {lookup && "error" in lookup ? (
                        <p role="alert" className="text-sm text-destructive">
                            {lookup.error}
                        </p>
                    ) : null}
                </div>
            </form>

            {lookup && "searched" in lookup ? (
                lookup.holder ? (
                    // Keyed by account, so a new lookup starts a fresh release form
                    <Holder key={lookup.holder.profile_id} holder={lookup.holder} />
                ) : (
                    <p className="text-sm text-copy">No account holds this document. The owner can add it on their identity page.</p>
                )
            ) : null}
        </div>
    )
}

function Holder({ holder }: { holder: IdentityHolder }) {
    const [state, release, releasing] = useActionState(releaseIdentityDocument.bind(null, holder.profile_id), null)

    if (state && "released" in state) {
        return (
            <section className="grid gap-1 rounded-xl border border-border bg-card p-4">
                <p className="font-medium">Released from {holder.full_name}&apos;s account.</p>
                <p className="text-sm text-copy">
                    The rightful owner can now add it on their identity page.
                    {holder.verification_status === "verified"
                        ? " That account's active properties have gone back to review."
                        : ""}
                </p>
            </section>
        )
    }

    return (
        <section className="grid gap-4 rounded-xl border border-border bg-card p-4">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Held by</dt>
                <dd>{holder.full_name}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{holder.email ?? "—"}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{holder.phone_number ?? "—"}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{labelFor(IDENTITY_STATUS_LABELS, holder.verification_status)}</dd>
            </dl>
            {holder.verification_status === "verified" ? (
                <p className="text-sm text-warning">
                    This document is verified. Releasing it unverifies this account&apos;s identity and sends its active properties back to
                    review.
                </p>
            ) : null}
            <form action={release} className="grid gap-3">
                <div className="grid gap-1.5">
                    <Label htmlFor="reason">Why it is released</Label>
                    <Textarea id="reason" name="reason" required maxLength={2000} />
                    <p className="text-xs text-muted-foreground">
                        How the owner proved it is theirs, for example on a video call holding the card. Kept in the audit log.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" variant="destructive" disabled={releasing}>
                        {releasing ? <Spinner /> : null}
                        Release from this account
                    </Button>
                    {state && "error" in state ? (
                        <p role="alert" className="text-sm text-destructive">
                            {state.error}
                        </p>
                    ) : null}
                </div>
            </form>
        </section>
    )
}
