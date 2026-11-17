// @vitest-environment node
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { renderEmail } from "@/emails/layout"
import { EMAILS } from "@/emails/templates"
import { safeNextPath } from "@/lib/auth/email-links"

const config = readFileSync("supabase/config.toml", "utf8")

describe.each(Object.entries(EMAILS))("the %s email", (name, email) => {
    const html = renderEmail(email)

    it("is what's in supabase/templates (run npm run emails:build after editing emails/templates.ts)", () => {
        expect(readFileSync(join("supabase", "templates", `${name}.html`), "utf8")).toBe(html)
    })

    it("links to our confirm route with Supabase's one-time token, to a page that route allows", () => {
        const url = new URL(email.button.url.replace("{{ .SiteURL }}", "https://ourprops.com"))
        expect(url.pathname).toBe("/api/auth/confirm")
        expect(url.searchParams.get("token_hash")).toBe("{{ .TokenHash }}")
        const next = url.searchParams.get("next")
        expect(safeNextPath(next)).toBe(next)
    })

    it("has its & written as &amp; in links, so mail apps read them right", () => {
        expect(html).toContain("token_hash={{ .TokenHash }}&amp;type=")
        expect(html).not.toMatch(/href="[^"]*&(?!amp;)/)
    })

    it("has the same subject in supabase/config.toml, for local emails", () => {
        expect(config).toContain(`[auth.email.template.${name}]\nsubject = "${email.subject}"`)
    })
})

describe("the email layout", () => {
    it("escapes our own text, but leaves Supabase's {{ }} variables alone", () => {
        const html = renderEmail({ ...EMAILS.recovery, heading: "Fish & <chips>", paragraphs: ["For {{ .Email }}"] })
        expect(html).toContain("Fish &amp; &lt;chips&gt;")
        expect(html).toContain("For {{ .Email }}")
    })
})
