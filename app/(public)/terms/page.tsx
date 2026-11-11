import type { Metadata } from "next"

import { getLegalPage } from "@/lib/content/legal"

import { LegalPage } from "../_components/legal-page"

export const metadata: Metadata = {
    title: "Terms & conditions",
    description: "The terms for using OurProps.",
}

// The text is edited in Sanity Studio under "Terms & conditions"
export default async function TermsPage() {
    return <LegalPage heading="Terms & conditions" content={await getLegalPage("termsAndConditions")} />
}
