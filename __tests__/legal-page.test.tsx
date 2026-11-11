import { cleanup, render, screen } from "@testing-library/react"
import type { PortableTextBlock } from "next-sanity"
import { afterEach, describe, expect, it, vi } from "vitest"

import { LegalPage } from "@/app/(public)/_components/legal-page"
import { toLegalContent } from "@/lib/content/legal"

// the loader's Sanity client needs project env vars; these tests only use the pure parts
vi.mock("@/sanity/lib/live", () => ({ sanityFetch: vi.fn() }))
vi.mock("@/sanity/lib/image", () => ({ urlFor: vi.fn() }))

afterEach(cleanup)

const block = (text: string, style = "normal", markDefs: PortableTextBlock["markDefs"] = [], marks: string[] = []): PortableTextBlock => ({
  _type: "block",
  _key: text.slice(0, 8),
  style,
  markDefs,
  children: [{ _type: "span", _key: "s", text, marks }],
})

describe("toLegalContent", () => {
  it("treats a missing, empty or malformed document as not published", () => {
    expect(toLegalContent(null)).toBeNull()
    expect(toLegalContent({ title: "Privacy policy", lastUpdated: "2026-11-10" })).toBeNull()
    expect(toLegalContent({ title: "Privacy policy", body: [] })).toBeNull()
    expect(toLegalContent({ title: "Privacy policy", body: "text" })).toBeNull()
  })

  it("keeps the body and drops a blank title or a non-string date", () => {
    expect(toLegalContent({ title: "  ", lastUpdated: 5, body: [block("Hi")] })).toEqual({
      title: null,
      lastUpdated: null,
      body: [block("Hi")],
    })
  })
})

describe("LegalPage", () => {
  it("shows the placeholder, with a way to reach us, until the page is published", () => {
    render(<LegalPage heading="Privacy policy" content={null} />)
    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeTruthy()
    expect(screen.getByText("We're finishing this page.")).toBeTruthy()
    expect(screen.getByRole("link", { name: "how to reach us" }).getAttribute("href")).toBe("/help#contact")
    expect(screen.queryByText(/Last updated/)).toBeNull()
  })

  it("shows the published title, date and text from Sanity", () => {
    render(
      <LegalPage
        heading="Terms & conditions"
        content={{ title: "Terms of use", lastUpdated: "2026-11-10", body: [block("Who we are", "h2"), block("We check property records.")] }}
      />
    )
    expect(screen.getByRole("heading", { level: 1, name: "Terms of use" })).toBeTruthy()
    expect(screen.getByText("10 November 2026")).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "Who we are" })).toBeTruthy()
    expect(screen.getByText("We check property records.")).toBeTruthy()
    expect(screen.queryByText("We're finishing this page.")).toBeNull()
  })

  it("renders web links but not javascript: links", () => {
    const body = [
      block("Safe link", "normal", [{ _type: "link", _key: "a", href: "https://example.com" }], ["a"]),
      block("Bad link", "normal", [{ _type: "link", _key: "b", href: "javascript:alert(1)" }], ["b"]),
    ]
    render(<LegalPage heading="Privacy policy" content={{ title: null, lastUpdated: null, body }} />)
    const safe = screen.getByRole("link", { name: "Safe link" })
    expect(safe.getAttribute("href")).toBe("https://example.com")
    expect(safe.getAttribute("rel")).toBe("noopener noreferrer")
    expect(screen.queryByRole("link", { name: "Bad link" })).toBeNull()
    expect(screen.getByText("Bad link")).toBeTruthy()
  })
})
