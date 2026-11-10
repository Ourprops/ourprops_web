// Built-in copy for the marketing site. It mirrors the Sanity `homePage` and
// `siteSettings` documents field for field, fills any gaps in CMS content,
// and is what `sanity/seed.ts` loads into a fresh dataset.
// Keep this file free of path aliases so the seed script can import it.

import {
  SHARE_DESCRIPTION,
  SHARE_TITLE,
  SIGN_UP_PATH,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "../site"

export type Link = { label: string; href: string }
export type SectionHeader = { eyebrow: string; heading: string; description: string }
export type Card = { title: string; description: string }

// Which view of the sample record each audience card shows; matches `accessLevel` in the Sanity schema. "full" is the
// owner's own record; "summary" and "documents" both show the public record, as nobody else sees an owner's documents
// (no document sharing in the MVP).
export const ACCESS_LEVELS = ["full", "summary", "documents"] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]

export const HOME_DEFAULTS = {
  hero: {
    eyebrow: "Property records for Ghana",
    heading: "Know the land before you pay for it.",
    subheading:
      "OurProps keeps a property's indenture, site plan, and mapped boundary together in one record, and our team checks them. Share the verified record with your family, lawyer, or buyer; your documents stay private.",
    primaryCta: { label: "Register your property", href: SIGN_UP_PATH } as Link,
    secondaryCta: { label: "See how it works", href: "/how-it-works" } as Link,
    launchNote: "Launching in Ghana",
    trustPoints: [
      { icon: "Lock", text: "Private by default" },
      { icon: "ShieldCheck", text: "Checked by a real review team" },
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
        title: "Show buyers what was checked",
        description:
          "Share the property's verified record with a link. It shows what our team checked, never your documents.",
        highlight: "A record buyers can trust",
      },
    ],
  },
  howItWorks: {
    header: {
      eyebrow: "How it works",
      heading: "Three steps to a verified property record.",
      description: "From scattered papers to a record people can trust. Your progress saves as a draft as you go.",
    } as SectionHeader,
    steps: [
      {
        title: "Register",
        description:
          "Tell us where the property is and how you got it, and mark its boundary on a map if you can. Save and finish later.",
      },
      {
        title: "We check it",
        description:
          "Upload your documents. Our team reviews them, the boundary and any overlapping claims, and tells you if anything is missing.",
      },
      {
        title: "Share it",
        description: "Once verified, send its public record to buyers, family or your lawyer. Your documents stay private.",
      },
    ] as Card[],
  },
  productPreview: {
    header: {
      eyebrow: "The property record",
      heading: "Everything about a plot, on one page.",
      description:
        "Each property gets a single record: where it is, where its edges run, the documents behind it, and what our team has checked.",
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
        "Owners see everything, documents included. Everyone else sees the public record: what our team checked, never the documents.",
    } as SectionHeader,
    items: [
      {
        title: "Property owners",
        description:
          "Keep the indenture, site plan and boundary together in one private place, and share a verified record when you're ready.",
        accessLevel: "full" as AccessLevel,
        cta: { label: "Register your property", href: SIGN_UP_PATH } as Link,
      },
      {
        title: "Buyers and families",
        description:
          "Ask the owner for the property's verified record before you pay, and see exactly what was checked.",
        accessLevel: "summary" as AccessLevel,
        cta: { label: "Questions buyers ask", href: "/faq" } as Link,
      },
      {
        title: "Lawyers, surveyors, and agents",
        description:
          "Start from a property's verified record when you advise a client, so everyone works from the same checked facts.",
        accessLevel: "documents" as AccessLevel,
        cta: { label: "See how it works", href: "/how-it-works" } as Link,
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
          "Clear records, and plain language about what we checked, what we didn't, and what OurProps does and doesn't do.",
      },
      {
        title: "Privacy",
        description: "Your documents are private by default. Only our verification team sees them, never the public.",
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
  getStarted: {
    header: {
      eyebrow: "Get started",
      heading: "Put your property on record.",
      description:
        "Create an account, tell us about your property and send your documents. Your progress saves as you go, so you can finish later.",
    } as SectionHeader,
    button: { label: "Register your property", href: SIGN_UP_PATH } as Link,
  },
}

export type HomeContent = typeof HOME_DEFAULTS

export const SITE_DEFAULTS = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  shareTitle: SHARE_TITLE,
  shareDescription: SHARE_DESCRIPTION,
  navigation: [
    { label: "How it works", href: "/how-it-works" },
    { label: "Who it's for", href: "/who-its-for" },
    { label: "FAQ", href: "/faq" },
    { label: "About", href: "/about" },
  ] as Link[],
  headerCta: { label: "Get started", href: SIGN_UP_PATH } as Link,
  footerTagline: "Property information, organized.",
  footerLinks: [
    { label: "How it works", href: "/how-it-works" },
    { label: "Who it's for", href: "/who-its-for" },
    { label: "FAQ", href: "/faq" },
    { label: "About", href: "/about" },
    { label: "Help", href: "/help" },
  ] as Link[],
  footerNote: "Built for conflict-free property transactions across Africa.",
  companyName: "OurProps Inc.",
}

export type SiteContent = typeof SITE_DEFAULTS

// The public FAQ (/faq), mirroring the Sanity `faqPage` document. The first three also show on the homepage.
// Price isn't here on purpose: add "How much does it cost?" in Studio once it's decided.
export const FAQ_DEFAULTS = {
  header: {
    eyebrow: "FAQ",
    heading: "Questions people ask before they start.",
    description: "What OurProps checks, who sees your documents, and what “verified” does and doesn't mean.",
  } as SectionHeader,
  items: [
    {
      question: "What does “verified” mean?",
      answer:
        "Our team reviewed the evidence for the property against OurProps' review rules: the owner's identity, the ownership documents, the boundary, and whether it overlaps another property. It is OurProps' review status, not a guarantee of legal title.",
    },
    {
      question: "Who can see my documents?",
      answer:
        "Only you and our verification team. A property's public record shows what we checked, never the documents themselves or who owns the property.",
    },
    {
      question: "How long does checking take?",
      answer:
        "It depends on the property and the documents. You'll see each step in your account, and we'll tell you as soon as we need anything or have finished.",
    },
    {
      question: "What do I need to register a property?",
      answer:
        "Your Ghana Card (or your passport if you live abroad), whatever property papers you have, such as an indenture, site plan or land title certificate, and where the property is. Photos from your phone are fine.",
    },
    {
      question: "I'm buying a property. How do I check it?",
      answer:
        "Ask the owner to register it on OurProps and send you the link to its public record. The record shows what our team checked and where the property is, without the owner's documents.",
    },
    {
      question: "What if I don't have all my documents?",
      answer: "Start anyway. Send what you have; we'll tell you what's missing and whether it stops the property being verified.",
    },
    {
      question: "What if someone else has registered my land?",
      answer:
        "Register it anyway and send us your evidence. When two properties overlap, our team looks into both. An overlap is a reason to check, not a decision about who owns the land.",
    },
    {
      question: "Does OurProps replace the Lands Commission or a lawyer?",
      answer:
        "No. OurProps organises and checks the evidence for a property, but it doesn't replace official land registry processes, a search, a surveyor or legal advice. For a purchase, still do your own checks.",
    },
  ],
}

export type FaqContent = typeof FAQ_DEFAULTS
