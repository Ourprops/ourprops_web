import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import type { Visitor } from "@/lib/auth/visitor"
import { MAIN_NAV, PRIMARY_CTA } from "@/lib/site"

import Sidebar from "./sidebar"

// The public site's header. Signed out: Sign in and Get started. Signed in: who they are, and the way back to their
// account, so nobody is asked to sign up for something they already have.
export default function Header({ visitor }: { visitor: Visitor | null }) {
  return (
    // A plain full-width bar with a hairline edge, like the header of a document
    <header className="material fixed inset-x-0 top-0 z-50 border-b border-border">
      <div className="mx-auto flex h-16 max-w-310 items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md" aria-label="OurProps home">
          <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" priority />
          <span className="text-lg font-bold tracking-tight text-ink">OurProps</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {MAIN_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink/75 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {visitor ? (
            <AccountLink visitor={visitor} />
          ) : (
            <>
              {/* for owners who already have an account; on a phone it's in the menu */}
              <Link
                href="/account/login"
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 sm:block"
              >
                Sign in
              </Link>
              <Link
                href={PRIMARY_CTA.href}
                className="pressable inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {PRIMARY_CTA.label}
              </Link>
            </>
          )}
          <Sidebar visitor={visitor} />
        </div>
      </div>
    </header>
  )
}

// Signed in: their initial (with a green "you're signed in" dot) and the way to their account
function AccountLink({ visitor }: { visitor: Visitor }) {
  return (
    <Link
      href={visitor.accountHref}
      aria-label={`${visitor.firstName ? `Signed in as ${visitor.firstName}. ` : "Signed in. "}Open ${visitor.accountLabel.toLowerCase()}`}
      className="pressable group inline-flex h-10 items-center gap-2 rounded-full bg-ink py-1 pr-4 pl-1 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Initial visitor={visitor} />
      <span className="hidden sm:inline">{visitor.accountLabel}</span>
      <span className="sm:hidden">Account</span>
      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
    </Link>
  )
}

export function Initial({ visitor, className }: { visitor: Visitor; className?: string }) {
  return (
    <span aria-hidden className={`relative flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-ink ${className ?? ""}`}>
      {visitor.firstName.charAt(0).toUpperCase() || "•"}
      <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-[#6FCF97] ring-2 ring-ink" />
    </span>
  )
}
