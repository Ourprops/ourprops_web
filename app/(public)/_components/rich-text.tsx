import { PortableText, type PortableTextBlock, type PortableTextComponents } from "next-sanity"

import { coverImage } from "@/lib/content/blog"

// Text written in Sanity's editor (legal pages, blog posts), in the house style. Headings start at h2 because the page
// title is the h1. Links only to the web, email, phone or this site; anything else (e.g. javascript:) is plain text.
const components: PortableTextComponents = {
    block: {
        normal: ({ children }) => <p className="text-copy leading-8">{children}</p>,
        h1: ({ children }) => <h2 className="mt-8 text-2xl font-bold tracking-tight text-ink md:text-3xl">{children}</h2>,
        h2: ({ children }) => <h2 className="mt-8 text-2xl font-bold tracking-tight text-ink md:text-3xl">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-6 text-xl font-semibold tracking-tight text-ink">{children}</h3>,
        h4: ({ children }) => <h4 className="mt-4 font-semibold text-ink">{children}</h4>,
        blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-secondary pl-5 text-lg leading-8 font-medium text-ink">{children}</blockquote>
        ),
    },
    list: {
        bullet: ({ children }) => <ul className="grid list-disc gap-2 pl-6 leading-8 text-copy">{children}</ul>,
        number: ({ children }) => <ol className="grid list-decimal gap-2 pl-6 leading-8 text-copy">{children}</ol>,
    },
    marks: {
        link: ({ children, value }) => {
            const href = typeof value?.href === "string" ? value.href : ""
            if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) return <>{children}</>
            const external = /^https?:/i.test(href)
            return (
                <a
                    href={href}
                    className="font-medium text-primary underline underline-offset-2"
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                    {children}
                </a>
            )
        },
    },
    types: {
        // A picture in a blog post, at its own shape (no crop), with its description and caption
        image: ({ value }) => {
            const image = coverImage(value, { width: 1400, height: 0 })
            if (!image) return null
            const caption = typeof value?.caption === "string" ? value.caption : null
            return (
                <figure className="my-4 grid gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- size unknown until loaded; Sanity serves it sized and in a modern format */}
                    <img src={image.url} alt={image.alt} loading="lazy" className="w-full rounded-2xl bg-muted" />
                    {caption ? <figcaption className="text-sm text-muted-foreground">{caption}</figcaption> : null}
                </figure>
            )
        },
    },
}

export function RichText({ value }: { value: PortableTextBlock[] }) {
    return <PortableText value={value} components={components} />
}

