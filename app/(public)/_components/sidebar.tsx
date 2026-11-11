import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import type { Visitor } from "@/lib/auth/visitor"
import { MAIN_NAV, PRIMARY_CTA } from "@/lib/site"

import { Initial } from "./header"

// The phone menu: the same links, then Get started and Sign in, or, when signed in, who they are and their account
export default function Sidebar({ visitor }: { visitor: Visitor | null }) {
    return (
        <Drawer showSwipeHandle>
            <DrawerTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-lg text-foreground hover:bg-background lg:hidden"
                        aria-label="Open menu"
                    />
                }
            >
                <Menu size={20} />
            </DrawerTrigger>
            <DrawerContent className="bg-card">
                <DrawerHeader>
                    <DrawerTitle className="text-primary">OurProps</DrawerTitle>
                </DrawerHeader>
                <nav className="flex flex-col gap-1 p-4" aria-label="Main">
                    {MAIN_NAV.map((link) => (
                        <DrawerClose
                            key={link.href}
                            nativeButton={false}
                            render={<a href={link.href} />}
                            className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-background"
                        >
                            {link.label}
                        </DrawerClose>
                    ))}
                </nav>

                <DrawerFooter>
                    {visitor ? (
                        <>
                            <p className="flex items-center gap-3 px-1 pb-1 text-sm text-copy">
                                <Initial visitor={visitor} className="ring-0" />
                                <span>
                                    Signed in{visitor.firstName ? <> as <span className="font-semibold text-ink">{visitor.firstName}</span></> : null}
                                </span>
                            </p>
                            <DrawerClose
                                nativeButton={false}
                                render={
                                    <Button
                                        className="pressable h-12 w-full rounded-full bg-ink text-[15px] text-white hover:bg-ink/90"
                                        nativeButton={false}
                                        render={<a href={visitor.accountHref} />}
                                    />
                                }
                            >
                                {visitor.accountLabel}
                            </DrawerClose>
                        </>
                    ) : (
                        <>
                            <DrawerClose
                                nativeButton={false}
                                render={
                                    <Button
                                        className="pressable h-12 w-full rounded-full bg-ink text-[15px] text-white hover:bg-ink/90"
                                        nativeButton={false}
                                        render={<a href={PRIMARY_CTA.href} />}
                                    />
                                }
                            >
                                {PRIMARY_CTA.label}
                            </DrawerClose>
                            {/* for owners who already have an account */}
                            <DrawerClose
                                nativeButton={false}
                                render={
                                    <Button
                                        variant="outline"
                                        className="pressable h-12 w-full rounded-full bg-card text-[15px] text-ink"
                                        nativeButton={false}
                                        render={<a href="/account/login" />}
                                    />
                                }
                            >
                                Sign in
                            </DrawerClose>
                        </>
                    )}
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
