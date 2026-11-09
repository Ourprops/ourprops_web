import { CircleHelp, LockKeyhole } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { supportWhatsAppUrl } from "@/lib/support"

import { AccountMenu } from "./account-menu"

// The frame of every signed-in owner page: OurProps home, help, and the owner's account at the top; how we protect
// their documents and how to reach a person at the bottom. The registration flow has its own frame, without links out,
// so an owner doesn't leave a half-filled step by accident.
export function OwnerShell({ fullName, children }: { fullName: string; children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
                    <Link href="/account/dashboard" className="flex items-center gap-2 font-semibold text-primary" aria-label="OurProps home">
                        <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" priority />
                        <span className="hidden sm:inline">OurProps</span>
                    </Link>
                    <nav className="ml-auto flex items-center gap-2" aria-label="Account">
                        <Link
                            href="/help"
                            className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-copy hover:bg-muted hover:text-foreground"
                        >
                            <CircleHelp size={18} aria-hidden />
                            Help
                        </Link>
                        <AccountMenu fullName={fullName} />
                    </nav>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-6 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

            <footer className="border-t border-border">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:px-6">
                    <Link href="/help#your-documents" className="flex items-center gap-1.5 hover:text-foreground">
                        <LockKeyhole size={14} aria-hidden />
                        How we protect your documents
                    </Link>
                    <a href={supportWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                        Questions? Chat with us on WhatsApp
                    </a>
                </div>
            </footer>
        </div>
    )
}
