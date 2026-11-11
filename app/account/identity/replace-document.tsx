"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

import { IdentityForm } from "./identity-form"

// Once a document is sent, the form steps aside, so it is clear the job is done. An owner who sent the wrong one can
// still bring it back and replace it; the new one is checked instead.
export function ReplaceDocument({ profileId }: { profileId: string }) {
    const [replacing, setReplacing] = useState(false)

    if (!replacing) {
        return (
            <Button type="button" variant="link" className="h-auto w-fit p-0 text-sm" onClick={() => setReplacing(true)}>
                Sent the wrong document? Replace it
            </Button>
        )
    }

    return (
        <section className="grid w-full max-w-2xl gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">Replace your document</h2>
                <Button type="button" variant="ghost" size="sm" onClick={() => setReplacing(false)}>
                    Cancel
                </Button>
            </div>
            <p className="text-sm text-copy">We&apos;ll check the new one instead, and delete the one you sent before.</p>
            <IdentityForm profileId={profileId} />
        </section>
    )
}
