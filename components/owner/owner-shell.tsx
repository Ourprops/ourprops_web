import { LockKeyhole, MessageCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { countUnseenNotifications, listRecentNotifications } from "@/lib/supabase/notifications"
import { createClient } from "@/lib/supabase/server"
import { supportWhatsAppUrl } from "@/lib/support"
import { cn } from "@/lib/utils"

import { AccountMenu } from "./account-menu"
import { NotificationBell } from "./notification-bell"
import { SidebarNav, TabBar } from "./owner-nav"
import { ownerInter } from "./owner-fonts"

function Logo({ className }: { className?: string }) {
    return (
        <Link
            href="/account/dashboard"
            className={cn("flex items-center gap-2 rounded-lg font-semibold tracking-tight text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
            aria-label="OurProps home"
        >
            <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" priority />
            <span>OurProps</span>
        </Link>
    )
}

// The frame of every signed-in owner page, laid out like the apps people know: a sidebar on a computer, a tab bar at
// the bottom of a phone, and the updates bell and account at the top of both. The registration flow has its own frame,
// without links out, so an owner doesn't leave a half-filled step by accident.
//
// owner-ui gives the owner area its look (app/globals.css): Inter, softer cards, orange for the main action.
export async function OwnerShell({ fullName, children }: { fullName: string; children: React.ReactNode }) {
    const supabase = await createClient()
    const [unseen, latest] = await Promise.all([countUnseenNotifications(supabase), listRecentNotifications(supabase, 6)])

    return (
        <div className={cn(ownerInter.variable, "owner-ui min-h-screen bg-background text-foreground")}>
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col gap-6 border-r border-border/70 bg-muted/60 px-3 py-4 lg:flex">
                <Logo className="px-2.5 py-1" />
                <SidebarNav unseen={unseen} />
            </aside>

            <div className="flex min-h-screen flex-col lg:pl-60">
                <header className="material sticky top-0 z-20 border-b border-border/70">
                    <div className="mx-auto flex h-16 max-w-5xl items-center gap-1.5 px-4 sm:px-6">
                        <Logo className="lg:hidden" />
                        <div className="ml-auto flex items-center gap-1.5">
                            <NotificationBell unseen={unseen} latest={latest} />
                            <AccountMenu fullName={fullName} />
                        </div>
                    </div>
                </header>

                <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-8 px-4 pt-6 pb-10 sm:px-6 sm:pt-8">{children}</main>

                {/* clear of the tab bar on phones */}
                <footer className="mb-[calc(4rem+env(safe-area-inset-bottom))] border-t border-border/70 lg:mb-0">
                    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
                        <Link href="/help#your-documents" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                            <LockKeyhole size={14} aria-hidden />
                            How we protect your documents
                        </Link>
                        <a
                            href={supportWhatsAppUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                        >
                            <MessageCircle size={14} aria-hidden />
                            Questions? Chat with us on WhatsApp
                        </a>
                    </div>
                </footer>
            </div>

            <TabBar unseen={unseen} />
        </div>
    )
}
