import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

/** Who is looking at a public page, for the header: their first name and where their account lives */
export type Visitor = { firstName: string; accountHref: string; accountLabel: string }

/**
 * The signed-in person viewing a public page, or null. For the header only, never for access: pages and data are
 * protected by the proxy and the database. Reads the session from the cookie (getClaims, no network call when the
 * project uses asymmetric keys) and, only when someone is signed in, their own profile row (allowed by RLS).
 * Any failure counts as signed out, so the public site always renders.
 */
export const getVisitor = cache(async (): Promise<Visitor | null> => {
    try {
        const supabase = await createClient()
        const { data } = await supabase.auth.getClaims()
        const userId = data?.claims?.sub
        if (!userId) return null

        const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", userId).maybeSingle()
        return toVisitor(profile)
    } catch {
        return null
    }
})

export function toVisitor(profile: { full_name?: string | null; role?: string | null } | null): Visitor {
    const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? ""
    // admins land in the console; the proxy and staff_role() still decide what they can open
    return profile?.role === "admin"
        ? { firstName, accountHref: "/admin", accountLabel: "Admin console" }
        : { firstName, accountHref: "/account/dashboard", accountLabel: "Your dashboard" }
}
