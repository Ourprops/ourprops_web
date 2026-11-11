import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { OwnerShell } from "@/components/owner/owner-shell"
import { listRecentNotifications } from "@/lib/supabase/notifications"
import { getOwnProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

import { Updates } from "../dashboard/updates"

export const metadata: Metadata = {
    title: "Updates",
}

// Everything that has happened to the owner's properties and identity document, newest first
export default async function UpdatesPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const profileId = data?.claims?.sub
    if (!profileId) redirect("/account/login")

    const [profile, notifications] = await Promise.all([getOwnProfile(supabase, profileId), listRecentNotifications(supabase, 100)])

    return (
        <OwnerShell fullName={profile?.full_name ?? "Account"}>
            <div className="grid gap-1.5">
                <h1 className="text-display text-ink">Updates</h1>
                <p className="text-copy">What has happened to your properties and your identity document.</p>
            </div>
            <div className="max-w-2xl">
                {notifications.length === 0 ? (
                    <p className="rounded-2xl border border-border bg-card p-6 text-center text-copy shadow-card">
                        Nothing yet. We&apos;ll tell you here when something changes.
                    </p>
                ) : (
                    <Updates notifications={notifications} title={null} />
                )}
            </div>
        </OwnerShell>
    )
}
