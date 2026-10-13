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
import type { Link } from "@/lib/content/defaults"

export default function Sidebar({ navigation, cta }: { navigation: Link[]; cta: Link }) {
    return (
        <Drawer showSwipeHandle>
            <DrawerTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-lg text-foreground hover:bg-background md:hidden"
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
                    {navigation.map((link) => (
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
                    <DrawerClose
                        nativeButton={false}
                        render={
                            <Button
                                className="pressable h-12 w-full rounded-lg bg-secondary text-[15px] text-secondary-foreground hover:bg-secondary/90"
                                nativeButton={false}
                                render={<a href={cta.href} />}
                            />
                        }
                    >
                        {cta.label}
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
