import type { Metadata } from "next"

import { requireAdmin } from "@/lib/auth/staff"

import { IdentityLookup } from "./identity-lookup"

export const metadata: Metadata = {
    title: "Identity documents",
}

// For an owner told "This document is already linked to another account": find the account holding it, and once the
// owner has proved it is theirs, release it (docs/admin.md, section 5).
export default async function IdentityPage() {
    await requireAdmin()

    return (
        <div className="grid max-w-2xl gap-6">
            <div className="grid gap-2">
                <h1 className="text-heading text-primary">Identity documents</h1>
                <p className="text-copy">
                    When an owner&apos;s card or passport is already linked to another account, find that account here. Release the
                    document only once the owner has proved it is theirs, for example on a video call holding it. Every lookup is
                    recorded.
                </p>
            </div>
            <IdentityLookup />
        </div>
    )
}
