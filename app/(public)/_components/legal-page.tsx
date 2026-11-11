import { FileText } from "lucide-react"
import Link from "next/link"
import { PortableText, type PortableTextComponents } from "next-sanity"

import type { LegalContent } from "@/lib/content/legal"

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

// Headings, lists and links in the house style; the body comes from Sanity's Portable Text editor
const components: PortableTextComponents = {
    block: {
        normal: ({ children }) => <p className="text-copy leading-7">{children}</p>,
        h1: ({ children }) => <h2 className="mt-6 text-xl font-semibold tracking-tight">{children}</h2>,
        h2: ({ children }) => <h2 className="mt-6 text-xl font-semibold tracking-tight">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-4 text-lg font-semibold">{children}</h3>,
        h4: ({ children }) => <h4 className="mt-2 font-semibold">{children}</h4>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-4 text-copy">{children}</blockquote>,
    },
    list: {
        bullet: ({ children }) => <ul className="grid list-disc gap-1.5 pl-5 text-copy leading-7">{children}</ul>,
        number: ({ children }) => <ol className="grid list-decimal gap-1.5 pl-5 text-copy leading-7">{children}</ol>,
    },
    marks: {
        link: ({ children, value }) => {
            const href = typeof value?.href === "string" ? value.href : ""
            // only web, mail and phone links; anything else (e.g. javascript:) renders as plain text
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
}

// The privacy policy or the terms: the published text from Sanity, or a plain placeholder until there is one
export function LegalPage({ heading, content }: { heading: string; content: LegalContent | null }) {
    return (
        <article className="mx-auto grid max-w-3xl gap-8 px-4 py-10 sm:px-6 sm:py-14">
            <header className="grid gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                    <FileText size={16} aria-hidden /> Legal
                </p>
                <h1 className="text-display text-primary">{content?.title ?? heading}</h1>
                {content?.lastUpdated ? (
                    <p className="text-sm text-muted-foreground">
                        Last updated <time dateTime={content.lastUpdated}>{dateFormat.format(new Date(content.lastUpdated))}</time>
                    </p>
                ) : null}
            </header>

            {content ? (
                <div className="grid gap-4">
                    <PortableText value={content.body} components={components} />
                </div>
            ) : (
                <div className="grid gap-2 rounded-2xl border border-dashed border-border bg-card p-6 shadow-card">
                    <p className="font-medium">We&apos;re finishing this page.</p>
                    <p className="text-sm text-copy">
                        The full {heading.toLowerCase()} will be here soon. If you have a question in the meantime, see{" "}
                        <Link href="/help#contact" className="font-medium text-primary underline underline-offset-2">
                            how to reach us
                        </Link>
                        .
                    </p>
                </div>
            )}
        </article>
    )
}
