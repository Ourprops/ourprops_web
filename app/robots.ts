import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

// Public pages are open to crawlers; the owner area, admin, Studio and API aren't worth crawling (and are behind sign-in)
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/account/", "/admin/", "/studio/", "/api/"] },
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
