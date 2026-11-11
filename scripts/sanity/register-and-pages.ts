/**
 * One-off content update for the switch from the waitlist to registering, and for the new pages (2026-11-10).
 *
 *   - hero, header and "who it's for" buttons → register (/account/login?mode=signup) or the new pages
 *   - header and footer links → /how-it-works, /who-its-for, /faq, /about (instead of #anchors on the homepage)
 *   - the site description loses "Join the waitlist."
 *   - adds the homepage's "Get started" section and the FAQ document, with the built-in text, so both are in Studio
 *
 * Dry run (prints what it would change):
 *   SANITY_API_WRITE_TOKEN=… npx tsx --env-file=.env.local scripts/sanity/register-and-pages.ts
 * Apply:
 *   SANITY_API_WRITE_TOKEN=… npx tsx --env-file=.env.local scripts/sanity/register-and-pages.ts --apply
 *
 * The token is read from the environment only and never printed. Each document is patched with ifRevisionID, so if
 * someone edits it in Studio meanwhile, the update fails instead of overwriting their edit; run it again.
 */
import { randomUUID } from "node:crypto"

import { FAQ_DEFAULTS, HOME_DEFAULTS, SITE_DEFAULTS } from "../../lib/content/defaults"

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_API_WRITE_TOKEN
const apply = process.argv.includes("--apply")
const API = `https://${projectId}.api.sanity.io/v2026-10-09/data`

if (!projectId || !dataset) throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET (use --env-file=.env.local)")
if (!token) throw new Error("Set SANITY_API_WRITE_TOKEN (an Editor token from sanity.io/manage)")

const key = () => randomUUID().replace(/-/g, "").slice(0, 12)
const link = (value: { label: string; href: string }) => ({ _type: "link", ...value })
const links = (values: { label: string; href: string }[]) => values.map((value) => ({ _key: key(), ...link(value) }))
const header = (value: { eyebrow: string; heading: string; description: string }) => ({ _type: "sectionHeader", ...value })

async function query<T>(groq: string): Promise<T> {
    const response = await fetch(`${API}/query/${dataset}?query=${encodeURIComponent(groq)}&perspective=raw`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error(`Query failed (${response.status})`)
    return ((await response.json()) as { result: T }).result
}

type Home = { _rev: string; audience?: { items?: { _key: string; title?: string }[] }; getStarted?: unknown }
type Site = { _rev: string; description?: string }

async function main() {
    const [home, site, faq, drafts] = await Promise.all([
        query<Home | null>(`*[_id == "homePage"][0]{_rev, audience{items[]{_key, title}}, getStarted}`),
        query<Site | null>(`*[_id == "siteSettings"][0]{_rev, description}`),
        query<{ _id: string } | null>(`*[_id == "faqPage"][0]{_id}`),
        query<string[]>(`*[_id in ["drafts.homePage", "drafts.siteSettings", "drafts.faqPage"]]._id`),
    ])
    if (!home || !site) throw new Error("homePage or siteSettings is missing in this dataset")
    if (drafts.length > 0) {
        // Publishing an older draft later would undo this update
        console.warn(`Unpublished Studio drafts exist (${drafts.join(", ")}). Publish or discard them first, then run again.`)
        process.exit(1)
    }

    const audienceCtas = HOME_DEFAULTS.audience.items.map((item) => item.cta)
    const homeSet: Record<string, unknown> = {
        "hero.primaryCta": link(HOME_DEFAULTS.hero.primaryCta),
        "hero.secondaryCta": link(HOME_DEFAULTS.hero.secondaryCta),
    }
    // The cards in the order they're shown: owners, buyers, professionals
    for (const [index, item] of (home.audience?.items ?? []).entries()) {
        if (audienceCtas[index]) homeSet[`audience.items[_key=="${item._key}"].cta`] = link(audienceCtas[index])
    }

    const mutations: unknown[] = [
        {
            patch: {
                id: "homePage",
                ifRevisionID: home._rev,
                set: homeSet,
                setIfMissing: {
                    getStarted: {
                        _type: "object",
                        header: header(HOME_DEFAULTS.getStarted.header),
                        button: link(HOME_DEFAULTS.getStarted.button),
                    },
                },
            },
        },
        {
            patch: {
                id: "siteSettings",
                ifRevisionID: site._rev,
                set: {
                    navigation: links(SITE_DEFAULTS.navigation),
                    headerCta: link(SITE_DEFAULTS.headerCta),
                    footerLinks: links(SITE_DEFAULTS.footerLinks),
                    ...(site.description?.includes(" Join the waitlist.")
                        ? { description: site.description.replace(" Join the waitlist.", "") }
                        : {}),
                },
            },
        },
    ]
    if (!faq) {
        mutations.push({
            createIfNotExists: {
                _id: "faqPage",
                _type: "faqPage",
                header: header(FAQ_DEFAULTS.header),
                items: FAQ_DEFAULTS.items.map((item) => ({ _key: key(), _type: "faqItem", ...item })),
            },
        })
    }

    console.log(JSON.stringify(mutations, null, 2))
    if (!apply) {
        console.log("\nDry run: nothing changed. Run again with --apply to write this to Sanity.")
        return
    }

    const response = await fetch(`${API}/mutate/${dataset}?returnIds=true`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ mutations }),
    })
    if (!response.ok) {
        // 409 means a document changed since it was read; run again
        throw new Error(`Update failed (${response.status}): ${(await response.text()).slice(0, 300)}`)
    }
    console.log("\nDone. The site picks it up within about a minute.")
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Update failed")
    process.exit(1)
})
