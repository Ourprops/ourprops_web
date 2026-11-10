import { CircleAlert, CircleCheck, CircleX, Clock, type LucideIcon } from "lucide-react"
import Link from "next/link"

import type { OwnNotification } from "@/lib/supabase/notifications"
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

const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" })
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })

/** "just now", "2 hours ago", "yesterday", then the date once it's a week old */
export function when(createdAt: string, now = Date.now()) {
    const minutes = Math.round((now - Date.parse(createdAt)) / 60_000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return relative.format(-minutes, "minute")
    const hours = Math.round(minutes / 60)
    if (hours < 24) return relative.format(-hours, "hour")
    const days = Math.round(hours / 24)
    if (days < 7) return relative.format(-days, "day")
    return dateFormat.format(new Date(createdAt))
}

// What has happened to the owner's properties and identity document, newest first, each linking to where they see it
// or act on it. Nothing to show means nothing has happened yet, so the list isn't shown at all.
export function Updates({ notifications }: { notifications: OwnNotification[] }) {
    if (notifications.length === 0) return null

    const unseen = notifications.filter((notification) => notification.read_at === null).map((notification) => notification.id)

    return (
        <section aria-labelledby="updates-title" className="grid gap-3">
            <h2 id="updates-title" className="font-medium">
                Recent updates
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {notifications.map((notification) => {
                    const { icon: Icon, className } = TONES[notification.type] ?? { icon: Clock, className: "text-muted-foreground" }
                    const isNew = notification.read_at === null
                    const content = (
                        <>
                            <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-hidden />
                            <span className="grid min-w-0 flex-1 gap-0.5">
                                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                                    <span className="font-medium">
                                        {isNew ? (
                                            <span className="mr-2 rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-primary-foreground uppercase">
                                                New
                                            </span>
                                        ) : null}
                                        {notification.title}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{when(notification.created_at)}</span>
                                </span>
                                <span className="text-sm text-copy wrap-anywhere">{notification.body}</span>
                            </span>
                        </>
                    )
                    return (
                        <li key={notification.id} className={isNew ? "bg-primary/5 first:rounded-t-xl last:rounded-b-xl" : undefined}>
                            {notification.action_url ? (
                                <Link href={notification.action_url} className="flex gap-3 px-4 py-3 hover:bg-muted">
                                    {content}
                                </Link>
                            ) : (
                                <div className="flex gap-3 px-4 py-3">{content}</div>
                            )}
                        </li>
                    )
                })}
            </ul>
            <MarkSeen ids={unseen} />
        </section>
    )
}
