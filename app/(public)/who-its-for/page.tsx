import type { Metadata } from "next"

import { getHomeContent } from "@/lib/content"

import Audience from "../_components/audience"
import GetStarted from "../_components/get-started"

export const metadata: Metadata = {
    title: "Who it's for",
    description:
        "For property owners, buyers and families, and the lawyers, surveyors and agents who advise them. Owners see everything; everyone else sees what was checked, never the documents.",
    alternates: { canonical: "/who-its-for" },
}

// Each person and what they see of a record. Text from Sanity: Homepage → Who it is for.
export default async function WhoItsForPage() {
    const content = await getHomeContent()

    return (
        <div className="pt-16">
            <Audience content={content.audience} variant="page" />
            <GetStarted content={content.getStarted} />
        </div>
    )
}
