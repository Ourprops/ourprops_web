import type { PostCard as Post } from "@/lib/content/blog"

import MoreLink from "./more-link"
import PostCard from "./post-card"
import SectionHeading from "./section-heading"

// The newest posts on the homepage. Shows nothing until the first post is published, so there's never an empty block.
export default function BlogSection({ posts }: { posts: Post[] }) {
    if (posts.length === 0) return null

    return (
        <section className="w-full py-24 md:py-36" id="blog" aria-labelledby="blog-title">
            <div className="mx-auto max-w-310 px-5 md:px-8">
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                    <SectionHeading
                        id="blog-title"
                        eyebrow="From the blog"
                        heading="Guides and news on property in Ghana."
                        description="Practical help with documents, boundaries and buying safely."
                    />
                    <MoreLink href="/blog" className="shrink-0">All posts</MoreLink>
                </div>
                <ul className="mt-14 grid grid-cols-1 gap-5 md:mt-16 md:grid-cols-3">
                    {posts.map((post, index) => (
                        <li key={post.id} className="flex">
                            <PostCard post={post} index={index} />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
