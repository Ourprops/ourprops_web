import Image from "next/image"
import Link from "next/link"

import { formatPostDate, type PostCard as Post } from "@/lib/content/blog"
import { cn } from "@/lib/utils"

const BLOCKS = ["bg-block-orange", "bg-block-sky", "bg-block-mint", "bg-block-sand"]

// A post on the blog page or the homepage. The whole card is clickable, but the link is the title, so it reads as
// one clear phrase. "featured" is the newest post on /blog: wider, with a bigger title.
export default function PostCard({ post, index = 0, featured = false }: { post: Post; index?: number; featured?: boolean }) {
    return (
        <article
            className={cn(
                "group relative flex w-full flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-ink/8 transition-shadow hover:shadow-[0_20px_50px_-25px_rgba(11,30,51,0.35)]",
                featured && "md:grid md:grid-cols-2"
            )}
        >
            <div className={cn("relative aspect-video overflow-hidden", !post.cover && BLOCKS[index % BLOCKS.length], featured && "md:aspect-auto md:min-h-80")}>
                {post.cover ? (
                    <Image
                        src={post.cover.url}
                        alt={post.cover.alt}
                        fill
                        sizes={featured ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 33vw, 100vw"}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                ) : (
                    // no cover yet: a colour block with the site-plan grid, so the card still looks finished
                    <div aria-hidden className="survey-grid absolute inset-0 [--grid-line:rgba(11,30,51,0.06)]" />
                )}
            </div>

            <div className={cn("flex flex-1 flex-col p-6", featured && "md:justify-center md:p-10")}>
                <p className="text-sm text-muted-foreground">
                    <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
                    {post.authorName ? <> · {post.authorName}</> : null}
                </p>
                <h3 className={cn("mt-2 font-bold tracking-tight text-ink", featured ? "text-3xl md:text-4xl" : "text-xl")}>
                    <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-3xl after:focus-visible:ring-3 after:focus-visible:ring-ring/50">
                        {post.title}
                    </Link>
                </h3>
                {post.excerpt ? <p className={cn("mt-3 leading-relaxed text-copy", featured ? "text-lg" : "line-clamp-3")}>{post.excerpt}</p> : null}
            </div>
        </article>
    )
}
