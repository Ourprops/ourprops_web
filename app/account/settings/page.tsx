import { Bell, ChevronRight, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { OwnerShell } from "@/components/owner/owner-shell"
import { getOwnProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

import { DetailsForm } from "./details-form"

export const metadata: Metadata = {
    title: "Settings",
}

// The owner's account in one place: their details, how they sign in, and how they hear from us
export default async function SettingsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const profileId = data?.claims?.sub
    if (!profileId) redirect("/account/login")

    const profile = await getOwnProfile(supabase, profileId)
    if (!profile) redirect("/account/login")

    return (
        <OwnerShell fullName={profile.full_name}>
            <div className="grid gap-1.5">
                <h1 className="text-display text-ink">Settings</h1>
                <p className="text-copy">Your details and how you sign in. Only our team sees these, never the public.</p>
            </div>

            <div className="grid max-w-2xl gap-6">
                <section aria-labelledby="details-title" className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
                    <h2 id="details-title" className="font-semibold tracking-tight">
                        Your details
                    </h2>
                    <DetailsForm fullName={profile.full_name} phoneNumber={profile.phone_number} />
                </section>

                <section aria-labelledby="account-title" className="grid gap-3">
                    <h2 id="account-title" className="font-semibold tracking-tight">
                        Your account
                    </h2>
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                        <li>
                            <Link href="/account/security" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted">
                                <ShieldCheck size={20} className="shrink-0 text-primary" aria-hidden />
                                <span className="grid flex-1 gap-0.5">
                                    <span className="font-medium">Sign-in security</span>
                                    <span className="text-sm text-copy">Add an authenticator app, so a stolen password alone can&apos;t open your account.</span>
                                </span>
                                <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden />
                            </Link>
                        </li>
                        <li className="flex items-center gap-3 px-5 py-4">
                            <Bell size={20} className="shrink-0 text-primary" aria-hidden />
                            <span className="grid flex-1 gap-0.5">
                                <span className="font-medium">Updates</span>
                                <span className="text-sm text-copy">
                                    We tell you about your properties and identity document here in the app, under{" "}
                                    <Link href="/account/updates" className="text-primary underline">
                                        Updates
                                    </Link>
                                    .
                                </span>
                            </span>
                        </li>
                    </ul>
                </section>
            </div>
        </OwnerShell>
    )
}
