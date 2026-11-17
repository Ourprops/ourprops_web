import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const toast = vi.hoisted(() => ({ success: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/lib/supabase/auth", () => ({
    formatAuthError: (error: Error) => ({ message: error.message }),
    signOut: vi.fn(),
}))

type Callbacks = { onSuccess?: (data?: unknown) => void; onError?: (error: Error) => void }

// Each mutation answers straight away with whatever the test sets: a value means success, an Error means failure
const outcomes = vi.hoisted(() => ({ enroll: undefined as unknown, verify: undefined as unknown, remove: undefined as unknown }))
const mfa = vi.hoisted(() => ({ factors: [] as unknown[], needsCode: false, enteredCode: false }))

function fakeMutation(key: "enroll" | "verify" | "remove") {
    return {
        isPending: false,
        mutate: (_vars: unknown, callbacks?: Callbacks) => {
            const outcome = outcomes[key]
            if (outcome instanceof Error) callbacks?.onError?.(outcome)
            else callbacks?.onSuccess?.(outcome)
        },
    }
}

vi.mock("@/lib/queries/profile", () => ({
    useMyProfile: () => ({ data: { role: "owner" }, isError: false }),
}))
vi.mock("@/lib/queries/mfa", () => ({
    useMfaStatus: () => ({ data: mfa, isError: false }),
    useEnrollTotp: () => fakeMutation("enroll"),
    useVerifyCode: () => fakeMutation("verify"),
    useRemoveFactor: () => fakeMutation("remove"),
}))

import SecurityPage from "@/app/account/security/page"

beforeEach(() => {
    toast.success.mockClear()
    mfa.factors = []
    mfa.needsCode = false
    outcomes.enroll = { factorId: "f1", qrCode: "data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E", secret: "ABC123" }
    outcomes.verify = undefined
    outcomes.remove = undefined
})
afterEach(cleanup)

function scanAndEnter(code: string) {
    render(<SecurityPage />)
    fireEvent.click(screen.getByRole("button", { name: "Add an authenticator app" }))
    fireEvent.change(screen.getByLabelText("Name this app"), { target: { value: "My phone" } })
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: code } })
    fireEvent.click(screen.getByRole("button", { name: "Finish setting up" }))
}

describe("Adding an authenticator app", () => {
    it("shows that it worked, by name, and offers to add another", async () => {
        scanAndEnter("123 456")

        const status = await screen.findByRole("status")
        expect(status.textContent).toContain("All set. My phone is protecting your account.")
        expect(toast.success).toHaveBeenCalledWith("Authenticator app added", expect.anything())
        expect(screen.getByRole("button", { name: "Add another app" })).toBeTruthy()
    })

    it("claims nothing when the code is wrong, and says why", async () => {
        outcomes.verify = new Error("That code isn't right.")
        scanAndEnter("000000")

        expect(await screen.findByText("That code isn't right.")).toBeTruthy()
        expect(screen.queryByText(/All set/)).toBeNull()
        expect(toast.success).not.toHaveBeenCalled()
    })

    it("clears the 'All set' message when they start adding another", async () => {
        scanAndEnter("123456")
        await screen.findByRole("status")
        fireEvent.click(screen.getByRole("button", { name: "Add another app" }))
        await waitFor(() => expect(screen.queryByText(/All set/)).toBeNull())
    })
})

describe("Removing an authenticator app", () => {
    it("confirms the removal by name", () => {
        mfa.factors = [{ id: "f1", friendly_name: "Old phone", created_at: "2026-01-01T00:00:00Z" }]
        mfa.enteredCode = true
        vi.spyOn(window, "confirm").mockReturnValue(true)

        render(<SecurityPage />)
        fireEvent.click(screen.getByRole("button", { name: "Remove" }))

        expect(toast.success).toHaveBeenCalledWith("Old phone removed")
    })
})

describe("Entering a code at sign-in", () => {
    it("confirms the code was accepted before moving on", () => {
        mfa.factors = [{ id: "f1", friendly_name: "My phone", created_at: "2026-01-01T00:00:00Z" }]
        mfa.needsCode = true

        render(<SecurityPage />)
        fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "123456" } })
        fireEvent.click(screen.getByRole("button", { name: "Continue" }))

        expect(toast.success).toHaveBeenCalledWith("Code accepted. You're signed in.")
    })
})
