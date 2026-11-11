import type { Metadata } from "next"

import { getHomeContent } from "@/lib/content"

import GetStarted from "../_components/get-started"
import HowItWorks from "../_components/how-it-works"
import ProductPreview from "../_components/product-preview"
import Technology from "../_components/technology"

export const metadata: Metadata = {
    title: "How it works",
    description:
        "Register your property, send your documents, and our team checks the ownership papers, the boundary and any overlapping claims. Then share the verified record.",
    alternates: { canonical: "/how-it-works" },
}

// The three steps, then the walkthrough of the record. Text from Sanity: Homepage → How it works, Product preview.
export default async function HowItWorksPage() {
    const content = await getHomeContent()

    return (
        <div>
            <HowItWorks content={content.howItWorks} variant="page" />
            <ProductPreview content={content.productPreview} />
            <Technology />
            <GetStarted content={content.getStarted} />
        </div>
    )
}
