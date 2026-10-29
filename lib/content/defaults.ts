// Built-in copy for the marketing site. It mirrors the Sanity `homePage` and
// `siteSettings` documents field for field, fills any gaps in CMS content,
// and is what `sanity/seed.ts` loads into a fresh dataset.
// Keep this file free of path aliases so the seed script can import it.

import {
  SHARE_DESCRIPTION,
  SHARE_TITLE,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "../site"

export type Link = { label: string; href: string }
export type SectionHeader = { eyebrow: string; heading: string; description: string }
export type Card = { title: string; description: string }

// How much of the sample record each audience card shows; matches `accessLevel` in the Sanity schema
export const ACCESS_LEVELS = ["full", "summary", "documents"] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]

export const HOME_DEFAULTS = {
  hero: {
    eyebrow: "Property records for Ghana",
    heading: "Know the land before you pay for it.",
    subheading:
      "OurProps keeps a property's indenture, site plan, and mapped boundary together in one record. Share it with your family, lawyer, or buyer, and show each of them only what they need.",
    primaryCta: { label: "Join the waitlist", href: "#waitlist" } as Link,
    secondaryCta: { label: "See how it works", href: "#how-it-works" } as Link,
    launchNote: "Launching in Ghana",
    trustPoints: [
      { icon: "Lock", text: "Private by default" },
      { icon: "ShieldCheck", text: "You choose who sees what" },
    ],
  },
  valueProposition: {
    header: {
      eyebrow: "The problem",
      heading: "A plot's story is usually scattered across people and paper.",
      description:
        "The indenture is with one relative, the site plan with the surveyor, and the receipts are in someone's phone. When nobody can see the whole picture, double sales and boundary disputes go unnoticed until money has changed hands.",
    } as SectionHeader,
    items: [
      {
        title: "See the boundary next to the papers",
        description:
          "Compare the mapped plot with its site plan and indenture, so a missing document or an overlapping claim shows up before you transact.",
        highlight: "Boundary and documents side by side",
      },
      {
        title: "Keep one record per property",
        description:
          "Indentures, site plans, receipts, and search reports live together, instead of in envelopes, chat threads, and filing cabinets.",
        highlight: "Nothing stuck in someone's phone",
      },
      {
        title: "Share exactly what's needed",
        description:
          "Give a lawyer the documents, a buyer the summary, and family the whole record. Everything else stays private.",
        highlight: "You choose who sees what",
      },
    ],
  },
  howItWorks: {
    header: {
      eyebrow: "How it works",
      heading: "From a folder of papers to one clear record.",
      description: "Most people finish in one sitting. Your progress saves as a draft as you go.",
    } as SectionHeader,
    steps: [
      {
        title: "Describe the property",
        description: "Give it a name and type, then add the region, district, and digital address.",
      },
      {
        title: "Map the boundary",
        description: "Find the plot on the map and trace its edges, or import the coordinates from your surveyor.",
      },
      {
        title: "Attach the documents",
        description:
          "Say how you acquired it and upload the indenture, site plan, and receipts. Then submit the record for review.",
      },
    ] as Card[],
  },
  productPreview: {
    header: {
      eyebrow: "The property record",
      heading: "Everything about a plot, on one page.",
      description:
        "Each property gets a single record: where it is, where its edges run, which documents back it up, and who can see it.",
    } as SectionHeader,
    callouts: [
      {
        title: "Mapped boundary",
        description: "The plot's edges on the map, with coordinates you can check against the site plan.",
      },
      {
        title: "Documents with a status",
        description: "Each document shows whether it's complete, in review, or still missing.",
      },
      {
        title: "Access you control",
        description: "A plain list of who can see the record, and how much of it.",
      },
    ] as Card[],
  },
  audience: {
    header: {
      eyebrow: "Who it's for",
      heading: "One record, seen differently by each person.",
      description:
        "Owners see everything. Everyone else sees only the parts the owner chooses to share with them.",
    } as SectionHeader,
    items: [
      {
        title: "Property owners",
        description:
          "Keep the indenture, site plan, and boundary together, and decide who can see each part.",
        accessLevel: "full" as AccessLevel,
        cta: { label: "For owners", href: "#waitlist" } as Link,
      },
      {
        title: "Buyers and families",
        description:
          "Ask for a property's record before you pay, then go through the boundary and papers with your lawyer.",
        accessLevel: "summary" as AccessLevel,
        cta: { label: "For buyers", href: "#waitlist" } as Link,
      },
      {
        title: "Lawyers, surveyors, and agents",
        description:
          "Work from the documents your client has shared, instead of chasing copies over chat.",
        accessLevel: "documents" as AccessLevel,
        cta: { label: "For professionals", href: "#waitlist" } as Link,
      },
    ],
  },
  values: {
    header: {
      eyebrow: "Our commitments",
      heading: "What we promise, and what we don't.",
      description: "For many families, property is the biggest thing they own. These are the rules we hold ourselves to.",
    } as SectionHeader,
    items: [
      {
        title: "Transparency",
        description:
          "Clear records, documents you can see, and plain language about what OurProps does and doesn't do.",
      },
      {
        title: "Privacy",
        description: "Your records are private by default. You decide who can see them, and which parts.",
      },
      {
        title: "Reliability",
        description:
          "Your records are there when you need them, in the same clear format every time.",
      },
    ] as Card[],
    disclaimer:
      "OurProps is an independent tool for organizing property information. It does not replace official land registry processes, and it is not legal advice or a guarantee of title.",
  },
  about: {
    header: {
      eyebrow: "About OurProps",
      heading: "Built to fix a problem we see in our own communities.",
      description:
        "Fraudulent sales, overlapping claims, and long disputes often start with property information that is scattered, incomplete, or hard to check. OurProps exists to change that.",
    } as SectionHeader,
    mission:
      "To bring transparency, efficiency, and trust to land and property in Ghana and West Africa through clear, well-organized property information.",
    vision:
      "To become the place people turn to for reliable property information and conflict-free transactions across Africa.",
  },
  waitlist: {
    header: {
      eyebrow: "Early access",
      heading: "Be one of the first to put your property on record.",
      description:
        "Join the waitlist and we'll email you as soon as OurProps opens in Ghana.",
    } as SectionHeader,
    submitLabel: "Join the waitlist",
    privacyNote: "No spam. Only launch news and important product updates.",
    successTitle: "You're on the list.",
    successMessage: "Thanks for signing up. We'll be in touch as soon as access opens.",
  },
}

export type HomeContent = typeof HOME_DEFAULTS

export const SITE_DEFAULTS = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  shareTitle: SHARE_TITLE,
  shareDescription: SHARE_DESCRIPTION,
  navigation: [
    { label: "How it works", href: "#how-it-works" },
    { label: "The record", href: "#product" },
    { label: "Who it's for", href: "#who-its-for" },
    { label: "About", href: "#about" },
  ] as Link[],
  headerCta: { label: "Join waitlist", href: "#waitlist" } as Link,
  footerTagline: "Property information, organized.",
  footerLinks: [
    { label: "How it works", href: "#how-it-works" },
    { label: "The record", href: "#product" },
    { label: "Who it's for", href: "#who-its-for" },
    { label: "About", href: "#about" },
    { label: "Waitlist", href: "#waitlist" },
  ] as Link[],
  footerNote: "Built for conflict-free property transactions across Africa.",
  companyName: "OurProps Inc.",
}

export type SiteContent = typeof SITE_DEFAULTS
