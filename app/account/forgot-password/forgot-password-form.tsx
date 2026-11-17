"use client"

import { ArrowLeft, MailCheck } from "lucide-react"
import Link from "next/link"
import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { forgotPasswordSchema } from "@/lib/validators/signup"

import AuthShell from "../_components/auth-shell"

// Asks Supabase to email a reset link. Whatever happens, as long as the request went through, the page says the same
// thing ("if there's an account, we've sent a link"), so nobody can use it to find out who has an account.
export function ForgotPasswordForm({ initialEmail, expired }: { initialEmail: string; expired: boolean }) {
    const [email, setEmail] = useState(initialEmail)
    const [error, setError] = useState<string>()
    const [sending, setSending] = useState(false)
    const [sentTo, setSentTo] = useState<string>()

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const parsed = forgotPasswordSchema.safeParse({ email })
        if (!parsed.success) {
            setError(parsed.error.issues[0].message)
            return
        }

        setError(undefined)
        setSending(true)
        try {
            const { error: sendError } = await createClient().auth.resetPasswordForEmail(parsed.data.email, {
                // used only if the email template is Supabase's default (see app/api/auth/confirm/route.ts)
                redirectTo: `${window.location.origin}/api/auth/confirm?next=/account/reset-password`,
            })
            if (sendError?.status === 429) {
                setError("You've asked for a few links already. Wait a minute, then try again.")
                return
            }
            // any other answer looks the same to the person: no hint about whether the account exists
            setSentTo(parsed.data.email)
        } catch {
            setError("We couldn't send the link. Check your connection and try again.")
        } finally {
            setSending(false)
        }
    }

    return (
        <AuthShell>
            <section>
                {sentTo ? (
                    <div className="grid gap-4" role="status">
                        <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
                            <MailCheck size={24} aria-hidden />
                        </span>
                        <h1 className="text-3xl font-bold tracking-[-0.03em] text-ink">Check your email</h1>
                        <p className="text-[15px] leading-relaxed text-copy">
                            If there&apos;s an OurProps account for <span className="font-semibold text-ink">{sentTo}</span>, we&apos;ve sent
                            it a link to set a new password. The link works for one hour.
                        </p>
                        <p className="text-sm text-copy">Not there after a few minutes? Check your spam folder, or try again.</p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button type="button" variant="outline" className="h-11 rounded-full px-5" onClick={() => setSentTo(undefined)}>
                                Try again
                            </Button>
                            <Link href="/account/login" className="flex h-11 items-center px-2 text-sm font-semibold text-ink hover:underline">
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="mb-8">
                            <Link href="/account/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 hover:text-ink">
                                <ArrowLeft size={15} aria-hidden /> Back to sign in
                            </Link>
                            <h1 className="text-3xl font-bold tracking-[-0.03em] text-ink">Reset your password</h1>
                            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                                Enter the email you signed up with, and we&apos;ll send you a link to set a new password.
                            </p>
                        </header>

                        {expired ? (
                            <p role="alert" className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-ink">
                                That link has expired or was already used. Ask for a new one below.
                            </p>
                        ) : null}

                        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    aria-invalid={Boolean(error)}
                                    aria-describedby={error ? "email-error" : undefined}
                                    className="h-11 bg-card px-3"
                                    placeholder="you@example.com"
                                />
                                {error ? (
                                    <p id="email-error" className="mt-1.5 text-sm text-destructive">
                                        {error}
                                    </p>
                                ) : null}
                            </div>
                            <Button
                                type="submit"
                                disabled={sending}
                                className="pressable h-11 w-full rounded-full bg-ink text-[15px] font-semibold text-white hover:bg-ink/90"
                            >
                                {sending ? "Sending…" : "Send me a link"}
                            </Button>
                        </form>
                    </>
                )}
            </section>
        </AuthShell>
    )
}
