import type { MetadataRoute } from "next"

import { getPostSlugs } from "@/lib/content/blog"
import { SITE_URL } from "@/lib/site"

// The public pages. Public property records (/record/…) are left out: owners share them by link, they aren't for search.
const PUBLIC_PAGES = ["/", "/how-it-works", "/who-its-for", "/faq", "/about", "/blog", "/help", "/privacy", "/terms"] as const

// The public pages, then every published blog post
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((path) => ({
        url: new URL(path, SITE_URL).toString(),
        changeFrequency: path === "/" ? "weekly" : "monthly",
        priority: path === "/" ? 1 : path === "/privacy" || path === "/terms" ? 0.3 : 0.7,
    }))
    const posts = (await getPostSlugs()).map((post) => ({
        url: new URL(`/blog/${post.slug}`, SITE_URL).toString(),
        lastModified: post.publishedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
    }))
    return [...pages, ...posts]
}
