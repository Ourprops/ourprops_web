import type { createClient } from "@/lib/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

export type OwnProfile = { id: string; full_name: string; phone_number: string | null }

/** The signed-in user's own profile, on the server. Row level security limits it to their own. */
export async function getOwnProfile(supabase: Supabase, profileId: string): Promise<OwnProfile | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number")
        .eq("id", profileId)
        .maybeSingle<OwnProfile>()
    if (error) throw error
    return data
}
