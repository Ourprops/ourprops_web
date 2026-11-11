import type { createClient } from "@/lib/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

export type OwnNotification = {
    id: string
    type: string
    title: string
    body: string
    action_url: string | null
    read_at: string | null
    created_at: string
}

/** The signed-in user's latest notifications, newest first. Row level security limits them to their own. */
export async function listRecentNotifications(supabase: Supabase, limit = 5, propertyId?: string): Promise<OwnNotification[]> {
    let query = supabase.from("notifications").select("id, type, title, body, action_url, read_at, created_at")
    // One property's updates only, for its own page
    if (propertyId) query = query.eq("entity_type", "property").eq("entity_id", propertyId)
    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit)
    if (error) throw error
    return (data ?? []) as OwnNotification[]
}

/** How many of the signed-in user's notifications they haven't seen yet */
export async function countUnseenNotifications(supabase: Supabase): Promise<number> {
    const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
    if (error) throw error
    return count ?? 0
}
