"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FORGOT_PASSWORD_PATH } from "@/lib/auth/email-links"
import { createClient } from "@/lib/supabase/client"
import { newPasswordSchema } from "@/lib/validators/signup"

import AuthShell from "../_components/auth-shell"

type Errors = { password?: string; confirmPassword?: string; form?: string; expired?: boolean }

/** What to tell the person when Supabase refuses the new password, in plain words */
export function resetErrorMessage(error: { code?: string; status?: number; message?: string }): Errors {
    switch (error.code) {
        case "same_password":
            return { password: "That's your current password. Choose a new one." }
        case "weak_password":
            return { password: "Choose a stronger password: at least 8 characters with letters and numbers." }
        case "session_not_found":
        case "session_expired":
        case "refresh_token_not_found":
            return { form: "Your reset link has expired.", expired: true }
        default:
            return { form: "We couldn't change your password. Try again in a moment." }
    }
}

// The new password, typed twice. On success: every other device is signed out (in case someone else had the old
// password), and they carry on to their account, already signed in.
export function ResetPasswordForm({ email }: { email: string | null }) {
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [show, setShow] = useState(false)
    const [errors, setErrors] = useState<Errors>({})
    const [saving, setSaving] = useState(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const parsed = newPasswordSchema.safeParse({ password, confirmPassword })
        if (!parsed.success) {
            const next: Errors = {}
            for (const issue of parsed.error.issues) {
                const field = issue.path[0] as "password" | "confirmPassword"
                next[field] ??= issue.message
            }
            setErrors(next)
            return
        }

        setErrors({})
        setSaving(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
            if (error) {
                setErrors(resetErrorMessage(error))
                return
            }
            // the password changed; whether other devices sign out shouldn't block them from carrying on
            await supabase.auth.signOut({ scope: "others" }).catch(() => undefined)
            toast.success("Your password has been changed.")
            router.replace("/account/dashboard")
            router.refresh()
        } catch {
            setErrors({ form: "We couldn't change your password. Check your connection and try again." })
        } finally {
            setSaving(false)
        }
    }

    const field = (
        id: "password" | "confirmPassword",
        label: string,
        value: string,
        onChange: (value: string) => void,
        autoComplete: string
    ) => (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
                {label}
            </label>
            <Input
                id={id}
                type={show ? "text" : "password"}
                autoComplete={autoComplete}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={Boolean(errors[id])}
                aria-describedby={errors[id] ? `${id}-error` : id === "password" ? "password-hint" : undefined}
                className="h-11 bg-card px-3"
            />
            {errors[id] ? (
                <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">
                    {errors[id]}
                </p>
            ) : id === "password" ? (
                <p id="password-hint" className="mt-1.5 text-xs text-muted-foreground">
                    At least 8 characters, with letters and numbers.
                </p>
            ) : null}
        </div>
    )

    return (
        <AuthShell>
            <section>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-[-0.03em] text-ink">Set a new password</h1>
                    <p className="mt-2 text-[15px] leading-relaxed text-copy">
                        {email ? (
                            <>
                                For <span className="font-semibold text-ink">{email}</span>. You&apos;ll stay signed in here, and
                                we&apos;ll sign you out everywhere else.
                            </>
                        ) : (
                            "You'll stay signed in here, and we'll sign you out everywhere else."
                        )}
                    </p>
                </header>

                {errors.form ? (
                    <p role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-ink">
                        {errors.form}{" "}
                        {errors.expired ? (
                            <Link href={FORGOT_PASSWORD_PATH} className="font-semibold underline underline-offset-2">
                                Ask for a new link
                            </Link>
                        ) : null}
                    </p>
                ) : null}

                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                    {field("password", "New password", password, setPassword, "new-password")}
                    {field("confirmPassword", "Type it again", confirmPassword, setConfirmPassword, "new-password")}
                    <label className="flex items-center gap-2 text-sm text-copy">
                        <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} className="size-4 accent-[var(--ink)]" />
                        Show passwords
                    </label>
                    <Button
                        type="submit"
                        disabled={saving}
                        className="pressable h-11 w-full rounded-full bg-ink text-[15px] font-semibold text-white hover:bg-ink/90"
                    >
                        {saving ? "Saving…" : "Save new password"}
                    </Button>
                </form>
            </section>
        </AuthShell>
    )
}
