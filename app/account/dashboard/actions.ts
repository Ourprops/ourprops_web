"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const idsSchema = z.array(z.uuid()).max(50)

// Marks the updates the dashboard has just shown as seen, so they aren't new next time. A public POST endpoint like any
// server action; mark_notifications_seen only touches the caller's own, and ignores anyone else's ids.
export async function markNotificationsSeen(ids: string[]): Promise<void> {
    const parsed = idsSchema.safeParse(ids)
    if (!parsed.success || parsed.data.length === 0) return

    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims?.sub) return

    const { error } = await supabase.rpc("mark_notifications_seen", { notification_ids: parsed.data })
    if (error) console.error("mark_notifications_seen failed", { code: error.code, message: error.message })
}
