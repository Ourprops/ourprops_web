import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// The admin console's server-side check (docs/admin.md, section 4). Call it in every admin page and before any
// admin data is loaded, not only in the layout: a layout doesn't re-run when the admin moves between pages.
// The database decides, through staff_role(), so this can't disagree with the policies: an admin role and a
// second factor that still exists. cache() runs it once per request however many times it is called.
export const requireAdmin = cache(async () => {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub

    if (!userId) {
        redirect("/account/login")
    }

    const { data: role, error } = await supabase.rpc("staff_role")
    if (error) {
        throw error
    }

    if (role === "admin") {
        return { supabase, adminId: userId }
    }

    // An admin who hasn't entered a code, or whose app was removed, sets one up first.
    // Everyone else gets not found, so the console's existence isn't advertised.
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
    if (profile?.role === "admin") {
        redirect("/account/security")
    }
    notFound()
})
