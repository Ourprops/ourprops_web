import Link from "next/link"
import { redirect } from "next/navigation"

import { getOwnIdentityDocument } from "@/lib/supabase/identity-documents"
import { listRecentNotifications } from "@/lib/supabase/notifications"
import { OWNER_STATUS_LABELS, listOwnProperties } from "@/lib/supabase/owner-properties"
import { createClient } from "@/lib/supabase/server"

import { IdentityCard } from "./identity-card"
import { Updates } from "./updates"

// A plain list for now, so owners can find a property that needs something from them
export default async function DashboardPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const ownerId = data?.claims?.sub
    if (!ownerId) redirect("/account/login")

    const [properties, identity, notifications] = await Promise.all([
        listOwnProperties(supabase, ownerId),
        getOwnIdentityDocument(supabase, ownerId),
        listRecentNotifications(supabase),
    ])

    return (
        <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8 sm:px-6">
            <Updates notifications={notifications} />

            <IdentityCard status={identity?.verification_status ?? null} />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-heading text-primary">Your properties</h1>
                <Link href="/account/dashboard/properties/new" className="text-sm font-medium text-primary hover:underline">
                    Register a property
                </Link>
            </div>

            {properties.length === 0 ? (
                <p className="text-copy">You haven&apos;t registered a property yet.</p>
            ) : (
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                    {properties.map((property) => (
                        <li key={property.id}>
                            <Link
                                href={
                                    property.status === "draft"
                                        ? `/account/dashboard/properties/new?draft=${property.id}`
                                        : `/account/dashboard/properties/${property.id}`
                                }
                                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted"
                            >
                                <span className="font-medium">{property.name ?? "Untitled property"}</span>
                                <span
                                    className={
                                        property.status === "action_required" ? "text-sm font-medium text-warning" : "text-sm text-copy"
                                    }
                                >
                                    {OWNER_STATUS_LABELS[property.status] ?? property.status}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    )
}
