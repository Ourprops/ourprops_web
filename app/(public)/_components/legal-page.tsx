import { FileText } from "lucide-react"
import Link from "next/link"

import type { LegalContent } from "@/lib/content/legal"

import { RichText } from "./rich-text"

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

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
                    <RichText value={content.body} />
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
