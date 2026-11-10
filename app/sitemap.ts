import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

// The public pages. Public property records (/record/…) are left out: owners share them by link, they aren't for search.
const PUBLIC_PAGES = ["/", "/how-it-works", "/who-its-for", "/faq", "/about", "/help", "/privacy", "/terms"] as const

export default function sitemap(): MetadataRoute.Sitemap {
    return PUBLIC_PAGES.map((path) => ({
        url: new URL(path, SITE_URL).toString(),
        changeFrequency: path === "/" ? "weekly" : "monthly",
        priority: path === "/" ? 1 : path === "/privacy" || path === "/terms" ? 0.3 : 0.7,
    }))
}
