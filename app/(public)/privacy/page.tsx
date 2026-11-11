import type { Metadata } from "next"

import { getLegalPage } from "@/lib/content/legal"

import { LegalPage } from "../_components/legal-page"

export const metadata: Metadata = {
    title: "Privacy policy",
    description: "How OurProps collects, uses and protects your information.",
}

// The text is edited in Sanity Studio under "Privacy policy"
export default async function PrivacyPage() {
    return <LegalPage heading="Privacy policy" content={await getLegalPage("privacyPolicy")} />
}
