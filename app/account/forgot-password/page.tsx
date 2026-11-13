import type { Metadata } from "next"

import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = { title: "Reset your password" }

// "Forgot password?" from sign-in lands here, with the email they'd typed; a reset link that expired comes back here
export default async function ForgotPasswordPage({ searchParams }: PageProps<"/account/forgot-password">) {
    const { email, expired } = await searchParams
    return <ForgotPasswordForm initialEmail={typeof email === "string" ? email : ""} expired={expired === "1"} />
}
