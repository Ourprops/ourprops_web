import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { FORGOT_PASSWORD_PATH } from "@/lib/auth/email-links"
import { createClient } from "@/lib/supabase/server"

import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = { title: "Set a new password" }

// Reached from a reset link (app/api/auth/confirm), which signs the person in for this. Without that session there's
// nothing to change, so they're sent to ask for a new link. The proxy sends accounts with an authenticator app to
// enter their code first, as Supabase only lets a fully signed-in session change the password.
export default async function ResetPasswordPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims?.sub) redirect(`${FORGOT_PASSWORD_PATH}?expired=1`)

    const email = typeof data.claims.email === "string" ? data.claims.email : null
    return <ResetPasswordForm email={email} />
}
