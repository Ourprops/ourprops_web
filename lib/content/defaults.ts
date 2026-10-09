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
export type Card = { icon: string; title: string; description: string }

export const HOME_DEFAULTS = {
  hero: {
    eyebrow: "Property information, organized",
    heading: "Know the property before you commit.",
    subheading:
      "OurProps keeps ownership documents, site plans, and mapped boundaries together in one clear record, so owners, buyers, and agents in Ghana can check the details and share them with confidence.",
    primaryCta: { label: "Join the waitlist", href: "#waitlist" } as Link,
    secondaryCta: { label: "See how it works", href: "#how-it-works" } as Link,
    launchNote: "Launching in Ghana",
    trustPoints: [
      { icon: "Lock", text: "Private by default" },
      { icon: "ShieldCheck", text: "You choose who sees your records" },
    ],
  },
  valueProposition: {
    header: {
      eyebrow: "Why OurProps",
      heading: "Property information shouldn't be scattered everywhere.",
      description:
        "When records are spread across people and places, it's hard to know what's true. OurProps brings property details, documents, and location together in one place built for Ghana.",
    } as SectionHeader,
    items: [
      {
        icon: "MapPinned",
        title: "Check the details before you transact",
        description:
          "See a property's mapped boundary alongside the documents behind it, so missing paperwork and overlapping claims come to light early.",
        highlight: "Boundaries and documents side by side",
      },
      {
        icon: "FolderOpen",
        title: "Keep documents and history together",
        description:
          "Deeds, site plans, receipts, and supporting records live in one organized record instead of folders, phones, and filing cabinets.",
        highlight: "One record per property",
      },
      {
        icon: "Users",
        title: "Share with the people who need it",
        description:
          "Give family, lawyers, buyers, or agents access to the right information, and keep everything else private.",
        highlight: "You control who sees what",
      },
    ],
  },
  howItWorks: {
    header: {
      eyebrow: "How it works",
      heading: "Three steps to a clear property record.",
      description: "A simple process that replaces scattered files with one organized place.",
    } as SectionHeader,
    steps: [
      {
        icon: "SquarePlus",
        title: "Add",
        description: "Enter the key details of a property: location, parcel number, size, and type.",
      },
      {
        icon: "FolderUp",
        title: "Organize",
        description:
          "Attach site plans, survey records, deeds, and notes so everything about the property sits in one record.",
      },
      {
        icon: "Share2",
        title: "Access",
        description:
          "View the record whenever you need it, and share it with family, lawyers, or buyers when you choose.",
      },
    ] as Card[],
  },
  productPreview: {
    header: {
      eyebrow: "The property record",
      heading: "Everything important, in one place.",
      description:
        "Each property gets a single record that brings its details, location, documents, and sharing together.",
    } as SectionHeader,
    callouts: [
      {
        icon: "MapPinned",
        title: "Location",
        description: "A clear map of where the property is and where its boundary runs.",
      },
      {
        icon: "FileText",
        title: "Documents",
        description: "Every supporting document, with its status, in one list.",
      },
      {
        icon: "Users",
        title: "Access",
        description: "A plain view of who can see the record, and how much of it.",
      },
    ] as Card[],
  },
  audience: {
    header: {
      eyebrow: "Who it's for",
      heading: "Designed for everyone involved in a property.",
      description:
        "Clear, organized records help each person in a transaction, from the owner to the buyer to the professionals in between.",
    } as SectionHeader,
    items: [
      {
        icon: "House",
        title: "Property owners",
        description:
          "Map your boundaries, keep ownership documents in one place, and decide who can view your records.",
        cta: { label: "For owners", href: "#waitlist" } as Link,
      },
      {
        icon: "Search",
        title: "Buyers and families",
        description:
          "Get clearer information about a property before you commit, so you can ask the right questions early.",
        cta: { label: "For buyers", href: "#waitlist" } as Link,
      },
      {
        icon: "BriefcaseBusiness",
        title: "Agents and professionals",
        description:
          "Work from organized records and documents when you coordinate with clients and other professionals.",
        cta: { label: "For professionals", href: "#waitlist" } as Link,
      },
    ],
  },
  values: {
    header: {
      eyebrow: "Our values",
      heading: "Trust is earned in the details.",
      description: "These commitments guide every feature we build for owners, buyers, and agents.",
    } as SectionHeader,
    items: [
      {
        icon: "Waypoints",
        title: "Transparency",
        description:
          "Clear records, documents you can see, and plain language about what OurProps does and doesn't do.",
      },
      {
        icon: "LockKeyhole",
        title: "Privacy",
        description: "Your records are private by default. You decide who can see them, and which parts.",
      },
      {
        icon: "ShieldCheck",
        title: "Reliability",
        description:
          "Consistent, dependable ways to manage property details and the documents that support them.",
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
      heading: "Be among the first to use OurProps.",
      description:
        "We're building a simpler way to manage property information. Join the waitlist to hear when we launch.",
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
