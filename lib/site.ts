// Absolute site URL for metadata, share images, and canonical links.
// Set NEXT_PUBLIC_SITE_URL in production; Vercel's production domain is used as a fallback.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")

export const SITE_NAME = "OurProps"

export const SITE_TITLE = "OurProps · Clear property records for Ghana"

export const SITE_DESCRIPTION =
  "Keep ownership documents, site plans, and mapped boundaries together in one clear record. Built for property owners, buyers, and agents in Ghana. Join the waitlist."

// Shorter, headline-led copy for link previews (WhatsApp, LinkedIn, X)
export const SHARE_TITLE = "Know the property before you commit."

export const SHARE_DESCRIPTION =
  "Property details, documents, and mapped boundaries in one clear record. Launching in Ghana."
