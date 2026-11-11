"use client"

import { ChartNoAxesColumn, IdCard, Inbox, LogOut, ShieldCheck, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { signOut } from "@/lib/supabase/auth"
import { cn } from "@/lib/utils"

type Item = { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean }

const OVERVIEW: Item = { href: "/admin/overview", label: "Overview", icon: ChartNoAxesColumn, match: (path) => path.startsWith("/admin/overview") }
// a property's review page belongs to the queue
const QUEUE: Item = { href: "/admin", label: "Review queue", icon: Inbox, match: (path) => path === "/admin" || path.startsWith("/admin/properties") }
const IDENTITY: Item = { href: "/admin/identity", label: "Identity documents", icon: IdCard, match: (path) => path.startsWith("/admin/identity") }

const linkClass = (active: boolean) =>
    cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "bg-card text-foreground shadow-card ring-1 ring-border/70" : "text-copy hover:bg-card/70 hover:text-foreground"
    )

/** Where an admin can go: the queue (with how many are waiting) and identity documents; on a phone, a row of tabs */
export function AdminNav({ waiting }: { waiting: number }) {
    const path = usePathname()

    return (
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:grid lg:gap-0.5 lg:overflow-visible">
            {[OVERVIEW, QUEUE, IDENTITY].map((item) => {
                const active = item.match(path)
                const Icon = item.icon
                return (
                    <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                        <Icon size={17} className={active ? "text-primary" : undefined} aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        {item === QUEUE && waiting > 0 ? (
                            <span className="rounded-full bg-secondary px-1.5 text-[0.7rem] leading-[1.125rem] font-semibold text-secondary-foreground tabular-nums">
                                {waiting}
                                <span className="sr-only"> waiting</span>
                            </span>
                        ) : null}
                    </Link>
                )
            })}
        </nav>
    )
}

/** The admin's own account: sign-in security, and signing out */
export function AdminAccount({ name }: { name: string }) {
    const router = useRouter()
    const [leaving, setLeaving] = useState(false)

    async function leave() {
        setLeaving(true)
        try {
            await signOut()
        } finally {
            router.replace("/account/login")
            router.refresh()
        }
    }

    return (
        <div className="grid gap-0.5">
            <p className="truncate px-2.5 pb-1 text-xs text-muted-foreground">Signed in as {name}</p>
            <Link href="/account/security" className={linkClass(false)}>
                <ShieldCheck size={17} aria-hidden /> Sign-in security
            </Link>
            <button type="button" onClick={leave} disabled={leaving} className={cn(linkClass(false), "w-full text-left")}>
                <LogOut size={17} aria-hidden /> {leaving ? "Signing out…" : "Sign out"}
            </button>
        </div>
    )
}
