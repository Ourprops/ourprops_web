import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { OwnerShell } from "@/components/owner/owner-shell"
import { getOwnProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

import { DetailsForm } from "./details-form"

export const metadata: Metadata = {
    title: "Your details",
}

export default async function DetailsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const profileId = data?.claims?.sub
    if (!profileId) redirect("/account/login")

    const profile = await getOwnProfile(supabase, profileId)
    if (!profile) redirect("/account/login")

    return (
        <OwnerShell fullName={profile.full_name}>
            <div className="grid gap-2">
                <h1 className="text-heading text-primary">Your details</h1>
                <p className="text-copy">Only our team sees these. They are never shown on a property&apos;s public record.</p>
            </div>
            <section className="rounded-xl border border-border bg-card p-5">
                <DetailsForm fullName={profile.full_name} phoneNumber={profile.phone_number} />
            </section>
        </OwnerShell>
    )
}
