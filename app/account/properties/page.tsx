import { Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { OwnerShell } from "@/components/owner/owner-shell"
import { buttonVariants } from "@/components/ui/button"
import { isPropertyFilter } from "@/lib/owner/property-filters"
import { listOwnProperties } from "@/lib/supabase/owner-properties"
import { getOwnProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

import { Welcome } from "../dashboard/welcome"
import { PropertiesBrowser } from "./properties-browser"

export const metadata: Metadata = {
    title: "Your properties",
}

// Every property the owner has registered, to find and open one. ?show= opens a filter, as the dashboard links do.
export default async function PropertiesPage({ searchParams }: PageProps<"/account/properties">) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const ownerId = data?.claims?.sub
    if (!ownerId) redirect("/account/login")

    const [profile, properties, { show }] = await Promise.all([getOwnProfile(supabase, ownerId), listOwnProperties(supabase, ownerId), searchParams])

    return (
        <OwnerShell fullName={profile?.full_name ?? "Account"}>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="grid gap-1.5">
                    <h1 className="text-display text-primary">Your properties</h1>
                    <p className="text-copy">
                        {properties.length === 0
                            ? "You haven't registered a property yet."
                            : properties.length === 1
                              ? "1 property"
                              : `${properties.length} properties`}
                    </p>
                </div>
                {properties.length > 0 ? (
                    <Link href="/account/dashboard/properties/new" className={buttonVariants({ variant: "cta", className: "h-10 px-4" })}>
                        <Plus aria-hidden /> Register a property
                    </Link>
                ) : null}
            </div>

            {properties.length === 0 ? (
                <Welcome />
            ) : (
                <PropertiesBrowser properties={properties} initialFilter={isPropertyFilter(show) ? show : "all"} />
            )}
        </OwnerShell>
    )
}
