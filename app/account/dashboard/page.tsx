import { ArrowRight, Plus } from "lucide-react"
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

import { Overview } from "./overview"
import { PropertyCard } from "./property-card"
import { TodoList } from "./todo-list"
import { Updates } from "./updates"
import { Welcome } from "./welcome"

// The dashboard shows the properties that changed most recently; the rest are on the Properties page
const RECENT = 4

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
            <Overview firstName={firstName ?? null} todoCount={todos.length} properties={properties} />

            {properties.length === 0 ? (
                <div className="grid gap-8">
                    <Welcome />
                    {/* Identity can be done before a first property; a draft can't exist yet */}
                    {todos.length > 0 ? <TodoList todos={todos} /> : null}
                    <Updates notifications={notifications} />
                </div>
            ) : (
                // On a wide screen, recent updates sit beside the work; on a phone, below it
                <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="grid min-w-0 gap-8">
                        <TodoList todos={todos} />

                        <section aria-labelledby="properties-title" className="grid gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 id="properties-title" className="font-semibold tracking-tight">
                                    {properties.length > RECENT ? "Recently changed" : "Your properties"}
                                </h2>
                                <Link href="/account/dashboard/properties/new" className={buttonVariants({ variant: "outline", className: "h-10" })}>
                                    <Plus aria-hidden /> Register another
                                </Link>
                            </div>
                            <ul className="grid gap-3 md:grid-cols-2">
                                {properties.slice(0, RECENT).map((property, index) => (
                                    <PropertyCard key={property.id} property={property} index={index} />
                                ))}
                            </ul>
                            {properties.length > RECENT ? (
                                <Link
                                    href="/account/properties"
                                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-card"
                                >
                                    View all {properties.length} properties <ArrowRight size={15} aria-hidden />
                                </Link>
                            ) : null}
                        </section>
                    </div>

                    <Updates notifications={notifications} seeAll />
                </div>
            )}
        </OwnerShell>
    )
}
