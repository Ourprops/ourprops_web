import type { Metadata } from "next"

import { getHomeContent } from "@/lib/content"

import About from "../_components/about"
import GetStarted from "../_components/get-started"
import Values from "../_components/values"

export const metadata: Metadata = {
    title: "About",
    description:
        "Why OurProps exists: to bring transparency and trust to land and property in Ghana, with clear, checked property information.",
    alternates: { canonical: "/about" },
}

// Mission, vision and values. Text from Sanity: Homepage → About, Values.
export default async function AboutPage() {
    const content = await getHomeContent()

    return (
        <div>
            <About content={content.about} />
            <Values content={content.values} />
            <GetStarted content={content.getStarted} />
        </div>
    )
}
