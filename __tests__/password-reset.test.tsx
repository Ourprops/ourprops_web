import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const replace = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

// the browser Supabase client: each test says what its auth calls return
const auth = vi.hoisted(() => ({
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
}))
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth }) }))

import { ForgotPasswordForm } from "@/app/account/forgot-password/forgot-password-form"
import { ResetPasswordForm, resetErrorMessage } from "@/app/account/reset-password/reset-password-form"
import { failedLinkPath, safeNextPath } from "@/lib/auth/email-links"
import { forgotPasswordSchema, newPasswordSchema } from "@/lib/validators/signup"

beforeEach(() => {
    replace.mockClear()
    for (const fn of Object.values(auth)) fn.mockReset()
})
afterEach(cleanup)

describe("where an email link may send someone", () => {
    it("only to our own pages on the list; anything else goes to the dashboard", () => {
        expect(safeNextPath("/account/reset-password")).toBe("/account/reset-password")
        expect(safeNextPath("/account/onboarding")).toBe("/account/onboarding")
        for (const next of ["//evil.example", "https://evil.example", "/admin", "/account/reset-password/../admin", null, ""]) {
            expect(safeNextPath(next)).toBe("/account/dashboard")
        }
    })

    it("sends a reset link that didn't work back to ask for a new one, and other links to sign in", () => {
        expect(failedLinkPath("recovery")).toBe("/account/forgot-password?expired=1")
        expect(failedLinkPath("signup")).toBe("/account/login?link=expired")
        expect(failedLinkPath(null)).toBe("/account/login?link=expired")
    })
})

describe("password rules", () => {
    it("the new password must be strong and typed the same twice", () => {
        expect(newPasswordSchema.safeParse({ password: "abc12345", confirmPassword: "abc12345" }).success).toBe(true)
        expect(newPasswordSchema.safeParse({ password: "abc12345", confirmPassword: "abc12346" }).error?.issues[0].message).toBe(
            "Passwords don't match."
        )
        expect(newPasswordSchema.safeParse({ password: "short1", confirmPassword: "short1" }).success).toBe(false)
        expect(newPasswordSchema.safeParse({ password: "lettersonly", confirmPassword: "lettersonly" }).success).toBe(false)
    })

    it("asks for a real email, and tidies it", () => {
        expect(forgotPasswordSchema.parse({ email: "  Ama@Example.com " })).toEqual({ email: "ama@example.com" })
        expect(forgotPasswordSchema.safeParse({ email: "ama" }).success).toBe(false)
    })
})

describe("Forgot password", () => {
    function send(email: string) {
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } })
        fireEvent.click(screen.getByRole("button", { name: "Send me a link" }))
    }

    it("says the same thing whether or not the account exists, so it can't be used to find accounts", async () => {
        auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null })
        render(<ForgotPasswordForm initialEmail="" expired={false} />)
        send("ama@example.com")
        const known = (await screen.findByRole("status")).textContent

        cleanup()
        auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { status: 400, code: "user_not_found", message: "User not found" } })
        render(<ForgotPasswordForm initialEmail="" expired={false} />)
        send("ama@example.com")
        expect((await screen.findByRole("status")).textContent).toBe(known)
        expect(known).toContain("If there's an OurProps account for ama@example.com")
    })

    it("sends the link back to our confirm route, to set a new password", async () => {
        auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null })
        render(<ForgotPasswordForm initialEmail="ama@example.com" expired={false} />)
        fireEvent.click(screen.getByRole("button", { name: "Send me a link" }))
        await screen.findByRole("status")
        expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("ama@example.com", {
            redirectTo: `${window.location.origin}/api/auth/confirm?next=/account/reset-password`,
        })
    })

    it("explains a rate limit, and checks the email before asking Supabase", async () => {
        render(<ForgotPasswordForm initialEmail="" expired={false} />)
        send("not-an-email")
        expect(await screen.findByText("Enter the email you signed up with.")).toBeTruthy()
        expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()

        auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { status: 429, message: "rate limit" } })
        send("ama@example.com")
        expect(await screen.findByText(/You've asked for a few links already/)).toBeTruthy()
    })

    it("tells someone whose link expired to ask for a new one", () => {
        render(<ForgotPasswordForm initialEmail="" expired />)
        expect(screen.getByRole("alert").textContent).toContain("That link has expired or was already used.")
    })
})

describe("Set a new password", () => {
    function save(password: string, again: string) {
        fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } })
        fireEvent.change(screen.getByLabelText("Type it again"), { target: { value: again } })
        fireEvent.click(screen.getByRole("button", { name: "Save new password" }))
    }

    it("refuses passwords that don't match, without asking Supabase", async () => {
        render(<ResetPasswordForm email="ama@example.com" />)
        save("abc12345", "abc12346")
        expect(await screen.findByText("Passwords don't match.")).toBeTruthy()
        expect(auth.updateUser).not.toHaveBeenCalled()
    })

    it("saves it, signs out every other device, and carries on to the dashboard", async () => {
        auth.updateUser.mockResolvedValueOnce({ error: null })
        auth.signOut.mockResolvedValueOnce({ error: null })
        render(<ResetPasswordForm email="ama@example.com" />)
        save("newpass123", "newpass123")
        await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/dashboard"))
        expect(auth.updateUser).toHaveBeenCalledWith({ password: "newpass123" })
        expect(auth.signOut).toHaveBeenCalledWith({ scope: "others" })
    })

    it("says so in plain words when Supabase refuses, and offers a new link when the session has gone", async () => {
        expect(resetErrorMessage({ code: "same_password" })).toEqual({ password: "That's your current password. Choose a new one." })
        auth.updateUser.mockResolvedValueOnce({ error: { code: "session_not_found", status: 403 } })
        render(<ResetPasswordForm email={null} />)
        save("newpass123", "newpass123")
        expect((await screen.findByRole("alert")).textContent).toContain("Your reset link has expired.")
        expect(screen.getByRole("link", { name: "Ask for a new link" }).getAttribute("href")).toBe("/account/forgot-password")
        expect(replace).not.toHaveBeenCalled()
    })
})
