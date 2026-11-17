import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { getHomeContent } from "@/lib/content"
import { formatPostDate, getPost } from "@/lib/content/blog"
import { toScriptJson } from "@/lib/json-ld"
import { SITE_NAME, SITE_URL } from "@/lib/site"

import GetStarted from "../../_components/get-started"
import { RichText } from "../../_components/rich-text"

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
    const post = await getPost((await params).slug)
    if (!post) return { title: "Post not found" }

    return {
        title: post.title,
        description: post.excerpt || undefined,
        alternates: { canonical: `/blog/${post.slug}` },
        authors: post.authorName ? [{ name: post.authorName }] : undefined,
        // the post's own share card: its title, summary and cover (the generated site image when there's no cover)
        openGraph: {
            type: "article",
            title: post.title,
            description: post.excerpt || undefined,
            publishedTime: post.publishedAt,
            url: `/blog/${post.slug}`,
            ...(post.cover ? { images: [{ url: post.cover.url, width: post.cover.width, height: post.cover.height, alt: post.cover.alt }] } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.excerpt || undefined,
            ...(post.cover ? { images: [post.cover.url] } : {}),
        },
    }
}

// One post: title, date and author, cover, then the text from Sanity, then the invitation to register
export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
    const [post, home] = await Promise.all([getPost((await params).slug), getHomeContent()])
    if (!post) notFound()

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt || undefined,
        datePublished: post.publishedAt,
        image: post.cover ? [post.cover.url] : undefined,
        author: post.authorName ? { "@type": "Person", name: post.authorName } : { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        mainEntityOfPage: new URL(`/blog/${post.slug}`, SITE_URL).toString(),
    }

    return (
        <div>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toScriptJson(jsonLd) }} />
            <article className="w-full pt-12 pb-20 md:pt-20 md:pb-28">
                <header className="mx-auto max-w-3xl px-5 md:px-8">
                    <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 hover:text-ink">
                        <ArrowLeft size={15} aria-hidden /> All posts
                    </Link>
                    <h1 className="text-section mt-6 text-ink">{post.title}</h1>
                    <p className="mt-5 text-muted-foreground">
                        <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
                        {post.authorName ? <> · {post.authorName}</> : null}
                    </p>
                    {post.excerpt ? <p className="text-lead mt-5 text-copy">{post.excerpt}</p> : null}
                </header>

                {post.cover ? (
                    <div className="mx-auto mt-10 max-w-5xl px-3 sm:px-5 md:mt-14 md:px-8">
                        <Image
                            src={post.cover.url}
                            alt={post.cover.alt}
                            width={post.cover.width}
                            height={post.cover.height}
                            priority
                            sizes="(min-width: 1024px) 1024px, 100vw"
                            className="block-panel w-full bg-muted object-cover"
                        />
                    </div>
                ) : null}

                <div className="mx-auto mt-10 grid max-w-3xl gap-5 px-5 text-lg md:mt-14 md:px-8">
                    <RichText value={post.body} />
                </div>
            </article>
            <GetStarted content={home.getStarted} />
        </div>
    )
}
