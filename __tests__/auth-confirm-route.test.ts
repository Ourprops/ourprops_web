// @vitest-environment node
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }))

import { GET } from "@/app/api/auth/confirm/route"

const visit = (query: string) => GET(new NextRequest(`http://localhost:3000/api/auth/confirm?${query}`))
const location = (response: Response) => {
    const url = new URL(response.headers.get("location")!)
    return url.pathname + url.search
}

beforeEach(() => {
    auth.verifyOtp.mockReset()
    auth.exchangeCodeForSession.mockReset()
})

describe("email link landing (/api/auth/confirm)", () => {
    it("checks a reset link and sends the person to set a new password", async () => {
        auth.verifyOtp.mockResolvedValueOnce({ error: null })
        const response = await visit("token_hash=abc&type=recovery&next=/account/reset-password")
        expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc" })
        expect(location(response)).toBe("/account/reset-password")
    })

    it("sends an expired or used reset link back to ask for a new one", async () => {
        auth.verifyOtp.mockResolvedValueOnce({ error: { code: "otp_expired" } })
        expect(location(await visit("token_hash=abc&type=recovery"))).toBe("/account/forgot-password?expired=1")
    })

    it("never follows ?next= off our own pages", async () => {
        auth.verifyOtp.mockResolvedValueOnce({ error: null })
        const response = await visit("token_hash=abc&type=signup&next=//evil.example")
        expect(new URL(response.headers.get("location")!).host).toBe("localhost:3000")
        expect(location(response)).toBe("/account/dashboard")
    })

    it("also accepts Supabase's default link, with a code", async () => {
        auth.exchangeCodeForSession.mockResolvedValueOnce({ error: null })
        expect(location(await visit("code=xyz&next=/account/reset-password"))).toBe("/account/reset-password")
    })

    it("refuses a link of a type it doesn't know, and a link with nothing in it", async () => {
        expect(location(await visit("token_hash=abc&type=weird"))).toBe("/account/login?link=expired")
        expect(location(await visit(""))).toBe("/account/login?link=expired")
        expect(auth.verifyOtp).not.toHaveBeenCalled()
    })

    it("never writes the token to the logs", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {})
        const error = vi.spyOn(console, "error").mockImplementation(() => {})
        auth.verifyOtp.mockResolvedValueOnce({ error: { code: "otp_expired" } })
        await visit("token_hash=secret-token-123&type=recovery")
        const logged = JSON.stringify([...log.mock.calls, ...error.mock.calls])
        expect(logged).not.toContain("secret-token-123")
        log.mockRestore()
        error.mockRestore()
    })
})
