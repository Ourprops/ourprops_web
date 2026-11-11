import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import Audience from "@/app/(public)/_components/audience"
import Faq, { HOME_FAQ_COUNT, faqJsonLd } from "@/app/(public)/_components/faq"
import { toScriptJson } from "@/lib/json-ld"
import GetStarted from "@/app/(public)/_components/get-started"
import HowItWorks from "@/app/(public)/_components/how-it-works"
import robots from "@/app/robots"
import sitemap from "@/app/sitemap"
import Header from "@/app/(public)/_components/header"
import { toVisitor } from "@/lib/auth/visitor"
import { FAQ_DEFAULTS, HOME_DEFAULTS } from "@/lib/content/defaults"
import { withoutAnchorLinks } from "@/lib/content/merge"
import { FOOTER_NAV, MAIN_NAV, PRIMARY_CTA, SIGN_UP_PATH } from "@/lib/site"

// the sitemap lists blog posts from Sanity; here, one live post
vi.mock("@/sanity/lib/live", () => ({
  sanityFetch: vi.fn(async () => ({ data: [{ slug: "how-to-read-a-site-plan", publishedAt: "2026-11-01T09:00:00Z" }] })),
}))
vi.mock("@/sanity/lib/image", () => ({ urlFor: vi.fn() }))
// the header's account check reads the session on the server; these tests pass the visitor in directly
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))
vi.mock("@/lib/queries/auth", () => ({
  useSignIn: () => ({ isPending: false, mutate: vi.fn() }),
  useSignUp: () => ({ isPending: false, mutate: vi.fn() }),
}))

import LoginForm from "@/app/account/login/login-form"

afterEach(cleanup)

describe("links", () => {
  // "#about" only works on the homepage; from /help or /faq it went nowhere. Every link now names a page.
  it("point at pages, not homepage anchors", () => {
    const hrefs = [
      ...FOOTER_NAV,
      HOME_DEFAULTS.hero.primaryCta,
      HOME_DEFAULTS.hero.secondaryCta,
      ...HOME_DEFAULTS.audience.items.map((item) => item.cta),
      HOME_DEFAULTS.getStarted.button,
    ].map((link) => link.href)
    expect(hrefs.filter((href) => href.startsWith("#"))).toEqual([])
  })

  it("include the blog in the header and every header page in the footer", () => {
    expect(MAIN_NAV.map((link) => link.href)).toContain("/blog")
    expect(FOOTER_NAV).toEqual(expect.arrayContaining(MAIN_NAV))
  })

  it("send every main button to sign-up, never a waitlist", () => {
    expect(PRIMARY_CTA).toEqual({ label: "Get started", href: SIGN_UP_PATH })
    expect(HOME_DEFAULTS.hero.primaryCta).toEqual(PRIMARY_CTA)
    expect(HOME_DEFAULTS.getStarted.button.href).toBe(SIGN_UP_PATH)
    expect(JSON.stringify(HOME_DEFAULTS).toLowerCase()).not.toContain("waitlist")
  })

  it("from Sanity that still point at an old #anchor are replaced by the built-in link", () => {
    const stale = {
      ...HOME_DEFAULTS,
      hero: { ...HOME_DEFAULTS.hero, secondaryCta: { label: "See how it works", href: "#how-it-works" } },
      audience: {
        ...HOME_DEFAULTS.audience,
        items: HOME_DEFAULTS.audience.items.map((item) => ({ ...item, cta: { label: "For owners", href: "#waitlist" } })),
      },
      getStarted: { ...HOME_DEFAULTS.getStarted, button: { label: "Sign up now", href: "/account/login?mode=signup" } },
    }
    const fixed = withoutAnchorLinks(stale, HOME_DEFAULTS)
    expect(fixed.hero.secondaryCta).toEqual(HOME_DEFAULTS.hero.secondaryCta)
    expect(fixed.audience.items.map((item) => item.cta)).toEqual(HOME_DEFAULTS.audience.items.map((item) => item.cta))
    // a real link someone set in Studio is kept
    expect(fixed.getStarted.button.label).toBe("Sign up now")
    expect(fixed.audience.header).toEqual(HOME_DEFAULTS.audience.header)
  })
})

describe("header", () => {
  it("signed out: offers Get started and Sign in", () => {
    render(<Header visitor={null} />)
    expect(screen.getByRole("link", { name: "Get started" }).getAttribute("href")).toBe(SIGN_UP_PATH)
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/account/login")
    expect(screen.getByRole("link", { name: "Blog" }).getAttribute("href")).toBe("/blog")
  })

  it("signed in: says who they are and links to their account instead of asking them to sign up", () => {
    render(<Header visitor={toVisitor({ full_name: "Ama Serwaa Mensah", role: "owner" })} />)
    const account = screen.getByRole("link", { name: "Signed in as Ama. Open your dashboard" })
    expect(account.getAttribute("href")).toBe("/account/dashboard")
    expect(screen.queryByRole("link", { name: "Get started" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull()
  })

  it("sends a signed-in admin to the console, and copes with a missing name", () => {
    expect(toVisitor({ full_name: "Kofi Boateng", role: "admin" })).toEqual({
      firstName: "Kofi",
      accountHref: "/admin",
      accountLabel: "Admin console",
    })
    expect(toVisitor(null)).toEqual({ firstName: "", accountHref: "/account/dashboard", accountLabel: "Your dashboard" })
    render(<Header visitor={toVisitor(null)} />)
    expect(screen.getByRole("link", { name: "Signed in. Open your dashboard" })).toBeTruthy()
  })
})

describe("sections as their own page", () => {
  it("use the section heading as the page's only h1 there, and an h2 on the homepage", () => {
    render(<HowItWorks content={HOME_DEFAULTS.howItWorks} variant="page" />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.queryByRole("link", { name: /walkthrough/ })).toBeNull()
    cleanup()

    render(<HowItWorks content={HOME_DEFAULTS.howItWorks} />)
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
    expect(screen.getByRole("link", { name: /See the whole walkthrough/ }).getAttribute("href")).toBe("/how-it-works")
  })

  it("gives each audience card one link with a clear name, and no mock-up on the homepage", () => {
    render(<Audience content={HOME_DEFAULTS.audience} />)
    const names = screen.getAllByRole("link").map((link) => link.textContent)
    expect(names).toEqual([...HOME_DEFAULTS.audience.items.map((item) => item.cta.label), "What each person sees"])
    expect(screen.queryByText("Exact boundary")).toBeNull()
  })
})

describe("FAQ", () => {
  it("shows the first three on the homepage, with a link to the rest", () => {
    render(<Faq content={FAQ_DEFAULTS} />)
    expect(screen.getAllByRole("group")).toHaveLength(HOME_FAQ_COUNT)
    expect(screen.getByRole("link", { name: /All questions/ }).getAttribute("href")).toBe("/faq")
  })

  it("shows every question on /faq, under the page's h1", () => {
    render(<Faq content={FAQ_DEFAULTS} variant="page" />)
    expect(screen.getAllByRole("group")).toHaveLength(FAQ_DEFAULTS.items.length)
    expect(screen.getByRole("heading", { level: 1, name: FAQ_DEFAULTS.header.heading })).toBeTruthy()
  })

  it("describes the same questions and answers as structured data, safe inside a script tag", () => {
    const content = { ...FAQ_DEFAULTS, items: [{ question: "Q?", answer: "</script><script>alert(1)</script>" }] }
    const json = toScriptJson(faqJsonLd(content))
    expect(json).not.toContain("</script>")
    expect(JSON.parse(json).mainEntity[0]).toEqual({
      "@type": "Question",
      name: "Q?",
      acceptedAnswer: { "@type": "Answer", text: "</script><script>alert(1)</script>" },
    })
  })
})

describe("Get started", () => {
  it("offers creating an account, and signing in for people who already have one", () => {
    render(<GetStarted content={HOME_DEFAULTS.getStarted} />)
    expect(screen.getByRole("link", { name: /Create your account/ }).getAttribute("href")).toBe(SIGN_UP_PATH)
    expect(screen.getByRole("link", { name: /Sign in/ }).getAttribute("href")).toBe("/account/login")
  })
})

describe("account page", () => {
  it("opens on the sign-up form when a Register button sent them", () => {
    render(<LoginForm initialMode="signup" />)
    expect(screen.getByLabelText(/Confirm password/i)).toBeTruthy()
  })

  it("opens on sign-in otherwise, and can still switch", () => {
    render(<LoginForm />)
    expect(screen.queryByLabelText(/Confirm password/i)).toBeNull()
    fireEvent.click(screen.getByRole("tab", { name: "Sign up" }))
    expect(screen.getByLabelText(/Confirm password/i)).toBeTruthy()
  })
})

describe("robots and sitemap", () => {
  it("lists every public page and published post with a full URL, and no owner or admin pages", async () => {
    const entries = await sitemap()
    expect(entries.map((entry) => new URL(entry.url).pathname)).toEqual([
      "/", "/how-it-works", "/who-its-for", "/faq", "/about", "/blog", "/help", "/privacy", "/terms",
      "/blog/how-to-read-a-site-plan",
    ])
    expect(entries.every((entry) => /^https?:\/\//.test(entry.url))).toBe(true)
  })

  it("keeps crawlers out of the owner area, admin, Studio and API, and points them to the sitemap", () => {
    const rules = robots().rules as { disallow: string[] }
    expect(rules.disallow).toEqual(expect.arrayContaining(["/account/", "/admin/", "/studio/"]))
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/)
  })
})
