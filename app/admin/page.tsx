import type { Metadata } from "next"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { PROPERTY_STATUS_LABELS, labelFor } from "@/lib/admin/labels"
import { getReviewQueue, type QueueItem } from "@/lib/admin/review"
import { requireAdmin } from "@/lib/auth/staff"

export const metadata: Metadata = {
    title: "Review queue",
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

// Properties in submitted, under review or changes requested, oldest submission first (docs/admin.md, section 8)
export default async function ReviewQueuePage() {
    const { supabase } = await requireAdmin()
    const queue = await getReviewQueue(supabase)

    return (
        <>
            <header className="mb-6">
                <h1 className="text-heading text-primary">Review queue</h1>
                <p className="mt-1 text-sm text-copy">
                    {queue.length === 0
                        ? "Nothing is waiting for review."
                        : `${queue.length} ${queue.length === 1 ? "property" : "properties"} waiting, oldest first.`}
                </p>
            </header>

            {queue.length > 0 ? (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {queue.map((item) => (
                        <QueueRow key={item.id} item={item} />
                    ))}
                </ul>
            ) : null}
        </>
    )
}

function QueueRow({ item }: { item: QueueItem }) {
    const missing = [
        item.hasBoundary ? null : "No boundary",
        item.documentCount === 0 ? "No documents" : null,
    ].filter(Boolean)

    return (
        <li>
            <Link
                href={`/admin/properties/${item.id}`}
                className="flex flex-col gap-2 px-4 py-4 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-6 sm:px-5"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">{item.name}</span>
                        <span className="text-data text-xs text-muted-foreground">{item.propId}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-copy">
                        {item.ownerName}
                        {item.place ? ` · ${item.place}` : null}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={item.status === "submitted" ? "default" : "outline"}>
                        {labelFor(PROPERTY_STATUS_LABELS, item.status)}
                    </Badge>
                    {item.openOverlaps > 0 ? (
                        <Badge variant="destructive">
                            {item.openOverlaps} {item.openOverlaps === 1 ? "overlap" : "overlaps"}
                        </Badge>
                    ) : null}
                    {missing.map((text) => (
                        <Badge key={text} variant="secondary">
                            {text}
                        </Badge>
                    ))}
                </div>

                <div className="text-sm text-muted-foreground sm:w-44 sm:text-right">
                    <div>{item.submittedAt ? `Submitted ${dateFormat.format(new Date(item.submittedAt))}` : "Not dated"}</div>
                    <div>{item.reviewerName ? `Reviewer: ${item.reviewerName}` : "No reviewer yet"}</div>
                </div>
            </Link>
        </li>
    )
}
