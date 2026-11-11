import type { Metadata } from "next"

import { getHomeContent } from "@/lib/content"
import { getPosts } from "@/lib/content/blog"

import GetStarted from "../_components/get-started"
import PostCard from "../_components/post-card"
import SectionHeading from "../_components/section-heading"

export const metadata: Metadata = {
    title: "Blog",
    description: "Guides and news on land and property in Ghana: documents, boundaries, searches and buying safely.",
    alternates: { canonical: "/blog" },
}

// Every published post, newest first and largest. Posts are written in Sanity Studio under "Blog posts".
export default async function BlogPage() {
    const [posts, home] = await Promise.all([getPosts(), getHomeContent()])
    const [newest, ...rest] = posts

    return (
        <div className="pt-16">
            <section className="w-full pt-16 pb-24 md:pt-24 md:pb-32">
                <div className="mx-auto max-w-310 px-5 md:px-8">
                    <SectionHeading
                        as="h1"
                        eyebrow="Blog"
                        heading="Guides and news on property in Ghana."
                        description="Practical help with documents, boundaries, searches and buying safely, from the OurProps team."
                    />

                    {newest ? (
                        <div className="mt-14 grid gap-5 md:mt-20">
                            <PostCard post={newest} featured />
                            {rest.length > 0 ? (
                                <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                    {rest.map((post, index) => (
                                        <li key={post.id} className="flex">
                                            <PostCard post={post} index={index + 1} />
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ) : (
                        <p className="block-panel mt-14 bg-block-sand p-8 text-lg text-ink md:mt-20">
                            Our first posts are on the way. Check back soon.
                        </p>
                    )}
                </div>
            </section>
            <GetStarted content={home.getStarted} />
        </div>
    )
}
