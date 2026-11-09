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
export async function listRecentNotifications(supabase: Supabase, limit = 5): Promise<OwnNotification[]> {
    const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, action_url, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
    if (error) throw error
    return (data ?? []) as OwnNotification[]
}
