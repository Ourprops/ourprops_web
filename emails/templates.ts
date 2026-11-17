import type { EmailContent } from "./layout"

// The words of each email Supabase sends. Edit here, then run `npm run emails:build` and paste the result into
// Supabase (docs/auth-emails.md). Links go to our confirm route with a one-time token hash, so they work on any device
// (app/api/auth/confirm/route.ts); next must be a page lib/auth/email-links.ts allows.
//
// Keys are the file names in supabase/templates/ and Supabase's own names for the emails.

const confirmLink = (type: string, next: string) =>
    `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=${type}&next=${next}`

export const EMAILS = {
    // Authentication → Emails → Reset Password
    recovery: {
        subject: "Reset your OurProps password",
        preheader: "Set a new password. The link works for one hour.",
        heading: "Set a new password",
        paragraphs: [
            "Someone asked to reset the password for your OurProps account. If it was you, tap the button below to choose a new one.",
            "The link works for one hour, and only once.",
        ],
        button: { label: "Set a new password", url: confirmLink("recovery", "/account/reset-password") },
        notes: ["Didn't ask for this? You can ignore this email. Your password won't change."],
    },
    // Authentication → Emails → Confirm signup
    confirmation: {
        subject: "Confirm your email for OurProps",
        preheader: "One tap to confirm your email and finish setting up your account.",
        heading: "Confirm your email",
        paragraphs: [
            "Welcome to OurProps. Tap the button below to confirm that {{ .Email }} is your email, and we'll take you to finish setting up your account.",
            "The link works for one hour.",
        ],
        button: { label: "Confirm my email", url: confirmLink("email", "/account/onboarding") },
        notes: ["Didn't sign up for OurProps? You can ignore this email. No account will be set up."],
    },
} satisfies Record<string, EmailContent>

export type EmailName = keyof typeof EMAILS
