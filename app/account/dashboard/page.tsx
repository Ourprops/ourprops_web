import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { OwnerShell } from "@/components/owner/owner-shell"
import { buttonVariants } from "@/components/ui/button"
import { ownerTodos } from "@/lib/owner/dashboard"
import { getOwnIdentityDocument } from "@/lib/supabase/identity-documents"
import { listRecentNotifications } from "@/lib/supabase/notifications"
import { listOwnProperties, loadChangeChecklists } from "@/lib/supabase/owner-properties"
import { getOwnProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

import { PropertyCard } from "./property-card"
import { TodoList } from "./todo-list"
import { Updates } from "./updates"
import { Welcome } from "./welcome"

export const metadata: Metadata = {
    title: "Your properties",
}

// The owner's home. In order: what needs them, where each property is, and what has happened. A new owner sees how
// it works and where to start instead of an empty list.
export default async function DashboardPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const ownerId = data?.claims?.sub
    if (!ownerId) redirect("/account/login")

    const [profile, properties, identity, notifications] = await Promise.all([
        getOwnProfile(supabase, ownerId),
        listOwnProperties(supabase, ownerId),
        getOwnIdentityDocument(supabase, ownerId),
        listRecentNotifications(supabase),
    ])
    const identityStatus = identity?.verification_status ?? null
    const checklists = await loadChangeChecklists(supabase, properties, identityStatus)
    const todos = ownerTodos({ properties, checklists, identityStatus })

    const firstName = profile?.full_name.trim().split(/\s+/)[0]

    return (
        <OwnerShell fullName={profile?.full_name ?? "Account"}>
            <div className="grid gap-1">
                <h1 className="text-heading text-primary">{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h1>
                <p className="text-copy">
                    {todos.length === 0
                        ? "Everything is in hand."
                        : todos.length === 1
                          ? "1 thing needs you."
                          : `${todos.length} things need you.`}
                </p>
            </div>

            {properties.length === 0 ? (
                <>
                    <Welcome />
                    {/* Identity can be done before a first property; a draft can't exist yet */}
                    {todos.length > 0 ? <TodoList todos={todos} /> : null}
                </>
            ) : (
                <>
                    <TodoList todos={todos} />

                    <section aria-labelledby="properties-title" className="grid gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="properties-title" className="font-medium">
                                Your properties
                            </h2>
                            <Link href="/account/dashboard/properties/new" className={buttonVariants({ variant: "outline", className: "h-10" })}>
                                Register another
                            </Link>
                        </div>
                        <ul className="grid gap-3">
                            {properties.map((property) => (
                                <PropertyCard key={property.id} property={property} />
                            ))}
                        </ul>
                    </section>
                </>
            )}

            <Updates notifications={notifications} />
        </OwnerShell>
    )
}
