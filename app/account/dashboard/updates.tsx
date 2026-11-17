import { CircleAlert, CircleCheck, CircleX, Clock, type LucideIcon } from "lucide-react"
import Link from "next/link"

import type { OwnNotification } from "@/lib/supabase/notifications"
import { when } from "@/lib/owner/when"
import { cn } from "@/lib/utils"

import { MarkSeen } from "./mark-seen"

// The tone of each kind of update: something to act on, good news, a setback, or just news
const TONES: Record<string, { icon: LucideIcon; className: string }> = {
    "property.changes_requested": { icon: CircleAlert, className: "text-warning" },
    "checkpoint.flagged": { icon: CircleAlert, className: "text-warning" },
    "property.approved": { icon: CircleCheck, className: "text-success" },
    "identity.verified": { icon: CircleCheck, className: "text-success" },
    "property.suspended": { icon: CircleX, className: "text-destructive" },
    "identity.rejected": { icon: CircleX, className: "text-destructive" },
    "identity.released": { icon: CircleX, className: "text-destructive" },
    "property.under_review": { icon: Clock, className: "text-primary" },
}

// Kept here for the tests and pages that import it from the dashboard
export { when }

// What has happened to the owner's properties and identity document, newest first, each linking to where they see it
// or act on it. Nothing to show means nothing has happened yet, so the list isn't shown at all.
// title null leaves the heading to the page, as on Updates; a link to see everything shows when there may be more.
export function Updates({
    notifications,
    title = "Recent updates",
    seeAll = false,
}: {
    notifications: OwnNotification[]
    title?: string | null
    seeAll?: boolean
}) {
    if (notifications.length === 0) return null

    const unseen = notifications.filter((notification) => notification.read_at === null).map((notification) => notification.id)

    return (
        <section aria-labelledby={title ? "updates-title" : undefined} aria-label={title ? undefined : "Updates"} className="animate-rise grid gap-3 motion-reduce:animate-none" style={{ animationDelay: "240ms" }}>
            {title ? (
                <div className="flex items-baseline justify-between gap-2">
                    <h2 id="updates-title" className="text-xl font-bold tracking-tight text-ink">
                        {title}
                    </h2>
                    {seeAll ? (
                        <Link href="/account/updates" className="text-sm font-medium text-primary hover:underline">
                            See all
                        </Link>
                    ) : null}
                </div>
            ) : null}
            {/* a timeline, newest at the top, as Linear's activity feed */}
            <ol className="relative grid gap-1 before:absolute before:top-3 before:bottom-3 before:left-[1.1875rem] before:w-px before:bg-border">
                {notifications.map((notification) => {
                    const { icon: Icon, className } = TONES[notification.type] ?? { icon: Clock, className: "text-muted-foreground" }
                    const isNew = notification.read_at === null
                    const content = (
                        <>
                            <span className="relative z-10 flex size-[1.375rem] shrink-0 items-center justify-center rounded-full bg-card">
                                <Icon className={cn("size-[1.125rem]", className)} aria-hidden />
                            </span>
                            <span className="grid min-w-0 flex-1 gap-0.5">
                                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                                    <span className="font-medium">
                                        {notification.title}
                                        {isNew ? (
                                            <span className="ml-2 inline-flex translate-y-[-1px] items-center rounded-full bg-secondary px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-foreground uppercase">
                                                New
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="text-xs text-muted-foreground tabular-nums">{when(notification.created_at)}</span>
                                </span>
                                <span className="text-sm text-copy wrap-anywhere">{notification.body}</span>
                            </span>
                        </>
                    )
                    return (
                        <li key={notification.id}>
                            {notification.action_url ? (
                                <Link
                                    href={notification.action_url}
                                    className={cn(
                                        "flex gap-3 rounded-xl px-2 py-2.5 transition-colors outline-none hover:bg-card hover:shadow-card focus-visible:ring-3 focus-visible:ring-ring/50",
                                        isNew && "bg-card shadow-card"
                                    )}
                                >
                                    {content}
                                </Link>
                            ) : (
                                <div className="flex gap-3 px-2 py-2.5">{content}</div>
                            )}
                        </li>
                    )
                })}
            </ol>
            <MarkSeen ids={unseen} />
        </section>
    )
}
