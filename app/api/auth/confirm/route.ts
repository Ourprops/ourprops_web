import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { failedLinkPath, safeNextPath } from "@/lib/auth/email-links"
import { createClient } from "@/lib/supabase/server"

const EMAIL_LINK_TYPES: readonly EmailOtpType[] = ["recovery", "signup", "invite", "magiclink", "email_change", "email"]

// Where links in Supabase's emails land: a password reset, or a sign-up confirmation. Checks the link once, which
// signs the person in for it, then sends them on: a reset to "Set a new password", anything else to their account.
//
// Two kinds of link arrive here:
//  - ?token_hash=…&type=recovery (our email template, supabase/templates/recovery.html). Works on any device, so a
//    reset asked for on a laptop can be finished on a phone.
//  - ?code=… (Supabase's default template, if the custom one isn't set up). Works only in the browser that asked.
//
// Nothing from the link is logged: a token in the logs is a working key to someone's account until it expires.
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const tokenHash = searchParams.get("token_hash")
    const rawType = searchParams.get("type")
    const type = EMAIL_LINK_TYPES.find((each) => each === rawType) ?? null
    const code = searchParams.get("code")
    const next = safeNextPath(searchParams.get("next"))

    const goTo = (path: string) => {
        const url = request.nextUrl.clone()
        const [pathname, query] = path.split("?")
        url.pathname = pathname
        url.search = query ? `?${query}` : ""
        return NextResponse.redirect(url)
    }

    const supabase = await createClient()

    if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        if (!error) return goTo(type === "recovery" ? safeNextPath("/account/reset-password") : next)
        console.error("Email link failed", { type, code: error.code })
        return goTo(failedLinkPath(type))
    }

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) return goTo(next)
        console.error("Email link failed", { type: "code", code: error.code })
        return goTo(failedLinkPath(next === "/account/reset-password" ? "recovery" : null))
    }

    return goTo(failedLinkPath(type))
}
