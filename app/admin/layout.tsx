import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { AdminAccount, AdminNav } from "@/components/admin/admin-nav"
import { QUEUE_STATUSES } from "@/lib/admin/review"
import { requireAdmin } from "@/lib/auth/staff"

export const metadata: Metadata = {
    title: "Admin",
    // The console is for staff only; keep it out of search results
    robots: { index: false, follow: false },
}

function Brand() {
    return (
        <Link href="/admin" className="flex items-center gap-2 rounded-lg font-semibold tracking-tight text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" priority />
            <span>OurProps</span>
            {/* always clear which side of OurProps this is */}
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-primary-foreground uppercase">Admin</span>
        </Link>
    )
}

// The proxy already turns away non-admins, but only for convenience. This checks again on the server before
// anything renders; each page checks too, because this layout doesn't re-run when the admin moves between pages.
// Laid out like the owner area: a sidebar on a computer, tabs along the top on a phone.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
    const { supabase, adminId } = await requireAdmin()

    const [{ data: profile }, { count: waiting }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", adminId).maybeSingle<{ full_name: string }>(),
        supabase.from("properties").select("id", { count: "exact", head: true }).in("status", [...QUEUE_STATUSES]),
    ])
    const name = profile?.full_name ?? "Admin"

    return (
        <div className="min-h-screen bg-background text-foreground">
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col gap-6 border-r border-border/70 bg-muted/60 px-3 py-4 lg:flex">
                <div className="px-2.5 py-1">
                    <Brand />
                </div>
                <AdminNav waiting={waiting ?? 0} />
                <div className="mt-auto">
                    <AdminAccount name={name} />
                </div>
            </aside>

            <header className="grid gap-2 border-b border-border/70 bg-muted/60 px-4 py-3 lg:hidden">
                <Brand />
                <AdminNav waiting={waiting ?? 0} />
            </header>

            <main className="px-4 py-6 sm:px-6 sm:py-8 lg:pl-[calc(15rem+2rem)] lg:pr-8">
                <div className="mx-auto max-w-6xl">{children}</div>
            </main>
        </div>
    )
}
