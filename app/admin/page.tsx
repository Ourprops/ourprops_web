import { CircleAlert, Clock, FileX, Inbox, MapPinOff, TriangleAlert } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { StatusGlyph } from "@/components/owner/status-glyph"
import { PROPERTY_STATUS_LABELS, labelFor } from "@/lib/admin/labels"
import { LONG_WAIT_DAYS, QUEUE_FILTERS, daysWaiting, filterQueue, isQueueFilter, queueCounts } from "@/lib/admin/queue-view"
import { getReviewQueue, type QueueItem } from "@/lib/admin/review"
import { requireAdmin } from "@/lib/auth/staff"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
    title: "Review queue",
}

// Properties in submitted, under review or changes requested, oldest submission first (docs/admin.md, section 8).
// ?show= picks a group, as the tiles and tabs link.
export default async function ReviewQueuePage({ searchParams }: PageProps<"/admin">) {
    const { supabase } = await requireAdmin()
    const [queue, { show }] = await Promise.all([getReviewQueue(supabase), searchParams])

    const filter = isQueueFilter(show) ? show : "all"
    const counts = queueCounts(queue)
    const shown = filterQueue(queue, filter)
    const longWaits = queue.filter((item) => (daysWaiting(item.submittedAt) ?? 0) >= LONG_WAIT_DAYS).length

    return (
        <div className="grid gap-8">
            <header className="grid gap-1.5">
                <h1 className="text-display text-primary">Review queue</h1>
                <p className="text-copy">
                    {queue.length === 0
                        ? "Nothing is waiting for review."
                        : `${queue.length} ${queue.length === 1 ? "property" : "properties"} waiting, oldest first.`}
                    {longWaits > 0 ? (
                        <span className="font-medium text-[color-mix(in_oklab,var(--secondary),black_25%)]">
                            {" "}
                            {longWaits} {longWaits === 1 ? "has" : "have"} waited a week or more.
                        </span>
                    ) : null}
                </p>
            </header>

            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile href="/admin?show=to_start" label="To start" value={counts.to_start} icon={Inbox} highlight={counts.to_start > 0} />
                <Tile href="/admin?show=in_review" label="In review" value={counts.in_review} icon={Clock} />
                <Tile href="/admin?show=waiting" label="Waiting on owner" value={counts.waiting} icon={CircleAlert} />
                <Tile href="/admin?show=overlaps" label="With overlaps" value={counts.overlaps} icon={TriangleAlert} danger={counts.overlaps > 0} />
            </dl>

            <section aria-labelledby="queue-title" className="grid gap-3">
                <h2 id="queue-title" className="sr-only">
                    Properties
                </h2>
                <nav aria-label="Show" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    {QUEUE_FILTERS.map((each) => {
                        const active = filter === each.key
                        return (
                            <Link
                                key={each.key}
                                href={each.key === "all" ? "/admin" : `/admin?show=${each.key}`}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-copy hover:text-foreground"
                                )}
                            >
                                {each.label}
                                <span className={cn("tabular-nums", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{counts[each.key]}</span>
                            </Link>
                        )
                    })}
                </nav>

                {shown.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-copy">
                        {queue.length === 0 ? "Nothing is waiting. New submissions appear here." : "Nothing in this group right now."}
                    </p>
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                        {shown.map((item) => (
                            <QueueRow key={item.id} item={item} />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

function Tile({
    href,
    label,
    value,
    icon: Icon,
    highlight = false,
    danger = false,
}: {
    href: string
    label: string
    value: number
    icon: typeof Inbox
    highlight?: boolean
    danger?: boolean
}) {
    return (
        <Link
            href={href}
            className="group grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/30"
        >
            <dt className="flex items-center gap-1.5 text-sm text-copy">
                <Icon size={15} className={danger ? "text-destructive" : highlight ? "text-secondary" : "text-muted-foreground"} aria-hidden />
                {label}
            </dt>
            <dd className={cn("text-3xl font-semibold tracking-tight tabular-nums", danger && "text-destructive")}>{value}</dd>
        </Link>
    )
}

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")

function QueueRow({ item }: { item: QueueItem }) {
    const days = daysWaiting(item.submittedAt)
    const long = days !== null && days >= LONG_WAIT_DAYS
    const flags = [
        item.openOverlaps > 0
            ? { icon: TriangleAlert, text: `${item.openOverlaps} ${item.openOverlaps === 1 ? "overlap" : "overlaps"}`, className: "bg-destructive/10 text-destructive" }
            : null,
        item.hasBoundary ? null : { icon: MapPinOff, text: "No boundary", className: "bg-warning-soft text-warning" },
        item.documentCount === 0 ? { icon: FileX, text: "No documents", className: "bg-warning-soft text-warning" } : null,
    ].filter((flag) => flag !== null)

    return (
        <li>
            <Link
                href={`/admin/properties/${item.id}`}
                className="group grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 px-4 py-4 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 sm:px-5 lg:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_8rem_2rem] lg:items-center"
            >
                <StatusGlyph status={item.status} className="mt-0.5 lg:mt-0" />
                <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="truncate font-medium text-foreground group-hover:text-primary">{item.name}</span>
                        <span className="text-data text-xs text-muted-foreground">{item.propId}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-copy">
                        {item.ownerName}
                        {item.place ? ` · ${item.place}` : null}
                    </p>
                </div>

                <div className="col-start-2 flex flex-wrap items-center gap-1.5 lg:col-start-auto">
                    <span className="text-sm font-medium">{labelFor(PROPERTY_STATUS_LABELS, item.status)}</span>
                    {flags.map(({ icon: Icon, text, className }) => (
                        <span key={text} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>
                            <Icon size={12} aria-hidden /> {text}
                        </span>
                    ))}
                </div>

                <div className="col-start-2 text-sm lg:col-start-auto lg:text-right">
                    {days === null ? (
                        <span className="text-muted-foreground">Not dated</span>
                    ) : (
                        <span className={cn("tabular-nums", long ? "font-medium text-[color-mix(in_oklab,var(--secondary),black_25%)]" : "text-copy")}>
                            {days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`}
                            <span className="text-muted-foreground"> waiting</span>
                        </span>
                    )}
                </div>

                <span
                    title={item.reviewerName ? `Reviewer: ${item.reviewerName}` : "No reviewer yet"}
                    className={cn(
                        "col-start-2 flex size-7 items-center justify-center rounded-full text-[0.7rem] font-semibold lg:col-start-auto",
                        item.reviewerName ? "bg-primary text-primary-foreground" : "border border-dashed border-border text-muted-foreground"
                    )}
                >
                    {item.reviewerName ? initials(item.reviewerName) : "—"}
                    <span className="sr-only">{item.reviewerName ? `Reviewer: ${item.reviewerName}` : "No reviewer yet"}</span>
                </span>
            </Link>
        </li>
    )
}
