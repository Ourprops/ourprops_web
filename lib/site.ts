// Absolute site URL for metadata, share images, and canonical links.
// Set NEXT_PUBLIC_SITE_URL in production; Vercel's production domain is used as a fallback.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")

export const SITE_NAME = "OurProps"

// Where every "Get started" button goes: the account page, opened on the sign-up form
export const SIGN_UP_PATH = "/account/login?mode=signup"

// The one thing the public site asks visitors to do. In code, not Sanity, so stale content can't change it.
export const PRIMARY_CTA = { label: "Get started", href: SIGN_UP_PATH }

// The public site's links. In code, not Sanity: they mirror the app's pages, and a link to a page that doesn't exist
// (or an old #anchor from when everything was on the homepage) can't come back from the CMS.
export const MAIN_NAV = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Who it's for", href: "/who-its-for" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
]

export const FOOTER_NAV = [...MAIN_NAV, { label: "Help", href: "/help" }]

export const SITE_TITLE = "OurProps · Clear property records for Ghana"

export const SITE_DESCRIPTION =
  "Keep ownership documents, site plans, and mapped boundaries together in one clear record. Built for property owners, buyers, and agents in Ghana."

// Shorter, headline-led copy for link previews (WhatsApp, LinkedIn, X)
export const SHARE_TITLE = "Know the property before you commit."

export const SHARE_DESCRIPTION =
  "Property details, documents, and mapped boundaries in one clear record. Launching in Ghana."
