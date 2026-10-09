import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import type { Link } from "@/lib/content/defaults"

export default function Sidebar({ navigation, cta }: { navigation: Link[]; cta: Link }) {
    return (
        <Sheet>
            <SheetTrigger
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
            </SheetTrigger>
            <SheetContent className="bg-card">
                <SheetHeader>
                    <SheetTitle className="text-primary">OurProps</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label="Main">
                    {navigation.map((link) => (
                        <SheetClose
                            key={link.href}
                            nativeButton={false}
                            render={<a href={link.href} />}
                            className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-background"
                        >
                            {link.label}
                        </SheetClose>
                    ))}
                </nav>

                <SheetFooter>
                    <SheetClose
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
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
