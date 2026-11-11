import type { Metadata } from "next"
import Link from "next/link"

import { getFaqContent, getHomeContent } from "@/lib/content"

import { toScriptJson } from "@/lib/json-ld"

import Faq, { faqJsonLd } from "../_components/faq"
import GetStarted from "../_components/get-started"

export const metadata: Metadata = {
    title: "FAQ",
    description:
        "What OurProps checks, who can see your documents, how long checking takes, and what “verified” does and doesn't mean.",
    alternates: { canonical: "/faq" },
}

// Every question, with FAQPage structured data. Text from Sanity: FAQ.
export default async function FaqPage() {
    const [faq, home] = await Promise.all([getFaqContent(), getHomeContent()])

    return (
        <div>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toScriptJson(faqJsonLd(faq)) }} />
            <Faq content={faq} variant="page" />
            <p className="mx-auto max-w-310 px-5 pt-10 text-base text-copy md:px-8">
                Already registered and stuck?{" "}
                <Link href="/help" className="font-medium text-primary underline underline-offset-2">
                    See the help page
                </Link>{" "}
                or message us.
            </p>
            <GetStarted content={home.getStarted} />
        </div>
    )
}
