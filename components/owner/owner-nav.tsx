"use client"

import { Bell, CircleHelp, House, IdCard, LayoutGrid, Settings, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean }

const HOME: NavItem = { href: "/account/dashboard", label: "Home", icon: House, match: (path) => path === "/account/dashboard" }
const PROPERTIES: NavItem = {
    href: "/account/properties",
    label: "Properties",
    icon: LayoutGrid,
    // a property's own page belongs to Properties
    match: (path) => path.startsWith("/account/properties") || path.startsWith("/account/dashboard/properties"),
}
const UPDATES: NavItem = { href: "/account/updates", label: "Updates", icon: Bell, match: (path) => path.startsWith("/account/updates") }
const IDENTITY: NavItem = { href: "/account/identity", label: "Identity", icon: IdCard, match: (path) => path.startsWith("/account/identity") }
const SETTINGS: NavItem = { href: "/account/settings", label: "Settings", icon: Settings, match: (path) => path.startsWith("/account/settings") }
const HELP: NavItem = { href: "/help", label: "Help", icon: CircleHelp, match: (path) => path.startsWith("/help") }

function Count({ value, className }: { value: number; className?: string }) {
    if (value === 0) return null
    return (
        <span className={cn("rounded-full bg-secondary px-1.5 text-[0.7rem] leading-[1.125rem] font-semibold text-foreground tabular-nums", className)}>
            {value > 99 ? "99+" : value}
            <span className="sr-only"> new</span>
        </span>
    )
}

/** The sidebar on wider screens: where to go, with what's new on Updates, and settings and help at the bottom */
export function SidebarNav({ unseen }: { unseen: number }) {
    const path = usePathname()

    const link = (item: NavItem) => {
        const active = item.match(path)
        const Icon = item.icon
        return (
            <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active ? "bg-card text-foreground shadow-card ring-1 ring-border/70" : "text-copy hover:bg-card/70 hover:text-foreground"
                )}
            >
                <Icon size={17} className={active ? "text-primary" : undefined} aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item === UPDATES ? <Count value={unseen} /> : null}
            </Link>
        )
    }

    return (
        <nav aria-label="Main" className="flex flex-1 flex-col gap-6">
            <div className="grid gap-0.5">{[HOME, PROPERTIES, UPDATES, IDENTITY].map(link)}</div>
            <div className="mt-auto grid gap-0.5">{[SETTINGS, HELP].map(link)}</div>
        </nav>
    )
}

/** The tab bar at the bottom of a phone screen, as in the apps people use every day */
export function TabBar({ unseen }: { unseen: number }) {
    const path = usePathname()

    return (
        <nav
            aria-label="Main"
            className="material fixed inset-x-0 bottom-0 z-30 border-t border-border/70 pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
            <ul className="mx-auto grid max-w-md grid-cols-4">
                {[HOME, PROPERTIES, UPDATES, SETTINGS].map((item) => {
                    const active = item.match(path)
                    const Icon = item.icon
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "relative flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium outline-none focus-visible:bg-muted",
                                    active ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {active ? <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-secondary" /> : null}
                                <span className="relative">
                                    <Icon size={21} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                                    {item === UPDATES ? <Count value={unseen} className="absolute -top-1.5 -right-3" /> : null}
                                </span>
                                {item.label}
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
