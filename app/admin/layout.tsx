import type { Metadata } from "next"
import Link from "next/link"

import BrandMark from "@/components/brand-mark"
import { requireAdmin } from "@/lib/auth/staff"

export const metadata: Metadata = {
    title: "Admin",
    // The console is for staff only; keep it out of search results
    robots: { index: false, follow: false },
}

// The proxy already turns away non-admins, but only for convenience. This checks again on the server before
// anything renders; each page checks too, because this layout doesn't re-run when the admin moves between pages.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
    await requireAdmin()

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="material sticky top-0 z-10 border-b border-border">
                <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
                    <Link href="/admin" className="flex items-center gap-2 font-semibold text-primary">
                        <BrandMark className="size-7" />
                        <span>OurProps admin</span>
                    </Link>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
        </div>
    )
}
