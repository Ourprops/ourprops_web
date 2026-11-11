"use client"

import { Menu } from "@base-ui/react/menu"
import { ChevronDown, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { signOut } from "@/lib/supabase/auth"

const itemClassName =
    "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-sm outline-none data-highlighted:bg-muted"

// The signed-in owner's name, opening their account: settings and signing out
export function AccountMenu({ fullName }: { fullName: string }) {
    const router = useRouter()
    const [signingOut, setSigningOut] = useState(false)
    const firstName = fullName.trim().split(/\s+/)[0] || "Account"

    async function leave() {
        setSigningOut(true)
        try {
            await signOut()
        } finally {
            router.replace("/account/login")
            router.refresh()
        }
    }

    return (
        <Menu.Root>
            <Menu.Trigger className="flex h-10 items-center gap-2 rounded-full border border-border bg-card pr-3 pl-1 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {firstName.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-28 truncate">{firstName}</span>
                <ChevronDown size={14} aria-hidden />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner align="end" sideOffset={6} className="z-50">
                    <Menu.Popup className="min-w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
                        <p className="truncate px-3 pt-1.5 pb-2 text-xs text-muted-foreground">{fullName}</p>
                        <Menu.LinkItem className={itemClassName} render={<Link href="/account/settings" />}>
                            <Settings size={16} aria-hidden /> Settings
                        </Menu.LinkItem>
                        <Menu.Separator className="my-1 h-px bg-border" />
                        <Menu.Item className={itemClassName} onClick={leave} disabled={signingOut}>
                            <LogOut size={16} aria-hidden /> {signingOut ? "Signing out…" : "Sign out"}
                        </Menu.Item>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}
