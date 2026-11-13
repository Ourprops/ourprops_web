// Where an email link (password reset, sign-up confirmation) may send someone once it has been checked, and where
// a link that failed goes. Only our own pages from this list: a link's ?next= is typed by whoever made the link,
// so anything else would let a crafted link bounce people to another page or site.

export const RESET_PASSWORD_PATH = "/account/reset-password"
export const FORGOT_PASSWORD_PATH = "/account/forgot-password"

const ALLOWED_NEXT = [RESET_PASSWORD_PATH, "/account/onboarding", "/account/dashboard"] as const

/** The page to go to after a link is checked: next if it's one we allow, otherwise the dashboard */
export function safeNextPath(next: string | null): string {
    return (ALLOWED_NEXT as readonly string[]).includes(next ?? "") ? (next as string) : "/account/dashboard"
}

/** Where a link that didn't work goes: a reset link back to "forgot password" to ask for a new one, others to sign in */
export function failedLinkPath(type: string | null): string {
    return type === "recovery" ? `${FORGOT_PASSWORD_PATH}?expired=1` : "/account/login?link=expired"
}
