import Link from "next/link"

import type { OwnIdentityDocument } from "@/lib/supabase/identity-documents"

// Reminds the owner from their first sign-in until their identity document is saved, and again if it is turned down.
// Nothing once it is verified.
export function IdentityCard({ status }: { status: OwnIdentityDocument["verification_status"] | null }) {
    if (status === "verified") return null

    const [title, text] =
        status === "unreviewed"
            ? ["We're checking your identity document", "You don't need to do anything. We'll let you know if we need something else."]
            : status === "rejected"
              ? ["Your identity document wasn't accepted", "See why, and add it again, so your properties can go live."]
              : ["Verify your identity", "Add your Ghana Card or passport once, and every property you register can go live."]

    return (
        <Link
            href="/account/identity"
            className={
                status === "unreviewed"
                    ? "grid gap-1 rounded-xl border border-border bg-card p-4 hover:bg-muted"
                    : "grid gap-1 rounded-xl border border-warning bg-card p-4 hover:bg-muted"
            }
        >
            <span className="font-medium">{title}</span>
            <span className="text-sm text-copy">{text}</span>
        </Link>
    )
}
