"use client"

import { Menu } from "@base-ui/react/menu"
import { Bell } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { markNotificationsSeen } from "@/app/account/dashboard/actions"
import { when } from "@/lib/owner/when"
import type { OwnNotification } from "@/lib/supabase/notifications"
import { cn } from "@/lib/utils"

// The bell at the top of every owner page: how many updates are new, and the latest few a tap away. Opening it marks
// them seen; the full history is on the Updates page.
export function NotificationBell({ unseen, latest }: { unseen: number; latest: OwnNotification[] }) {
    const [count, setCount] = useState(unseen)

    function opened(open: boolean) {
        if (!open || count === 0) return
        const ids = latest.filter((notification) => notification.read_at === null).map((notification) => notification.id)
        setCount(0)
        if (ids.length > 0) void markNotificationsSeen(ids)
    }

    return (
        <Menu.Root onOpenChange={opened}>
            <Menu.Trigger
                aria-label={count > 0 ? `Updates, ${count} new` : "Updates"}
                className="relative flex size-10 items-center justify-center rounded-full text-ink/75 outline-none transition-colors hover:bg-ink/5 hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
            >
                <Bell size={19} aria-hidden />
                {count > 0 ? (
                    <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[0.65rem] leading-4 font-semibold text-ink ring-2 ring-card tabular-nums">
                        {count > 9 ? "9+" : count}
                    </span>
                ) : null}
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner align="end" sideOffset={6} className="z-50">
                    <Menu.Popup className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg outline-none">
                        <p className="border-b border-border px-4 py-3 text-sm font-semibold">Updates</p>
                        {latest.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-copy">Nothing yet. We&apos;ll tell you here when something changes.</p>
                        ) : (
                            <div className="max-h-96 overflow-y-auto p-1.5">
                                {latest.map((notification) => (
                                    <Menu.LinkItem
                                        key={notification.id}
                                        render={<Link href={notification.action_url ?? "/account/updates"} />}
                                        className="flex gap-2.5 rounded-lg px-2.5 py-2.5 outline-none data-highlighted:bg-muted"
                                    >
                                        <span
                                            aria-hidden
                                            className={cn("mt-1.5 size-2 shrink-0 rounded-full", notification.read_at === null ? "bg-secondary" : "bg-transparent")}
                                        />
                                        <span className="grid min-w-0 gap-0.5">
                                            <span className="text-sm font-medium">{notification.title}</span>
                                            <span className="line-clamp-2 text-xs text-copy">{notification.body}</span>
                                            <span className="text-[0.7rem] text-muted-foreground">{when(notification.created_at)}</span>
                                        </span>
                                    </Menu.LinkItem>
                                ))}
                            </div>
                        )}
                        <Menu.LinkItem
                            render={<Link href="/account/updates" />}
                            className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-primary outline-none data-highlighted:bg-muted"
                        >
                            See all updates
                        </Menu.LinkItem>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}
