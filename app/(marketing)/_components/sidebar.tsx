import Link from "next/link"
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
import { Menu, ShieldCheck } from "lucide-react"

const NAV_LINKS = [
    { label: "About", href: "#about" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Who it's for", href: "#who-its-for" },
    { label: "Our values", href: "#our-values" },
]

export default function Sidebar() {
    return (
        <Sheet>
            <SheetTrigger>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-md border border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100"
                    aria-label="Open menu"
                >
                    <Menu size={22} />
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-white/95 backdrop-blur-xl border-l border-slate-200">
                <SheetHeader className="gap-3">
                    <SheetTitle className="text-slate-900">OurProps</SheetTitle>
                    <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        Secure ownership platform
                    </div>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                    {NAV_LINKS.map((link) => (
                        <SheetClose key={link.href} render={<Link href={link.href} />}>
                            <span className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                                {link.label}
                            </span>
                        </SheetClose>
                    ))}
                </nav>

                <SheetFooter>
                    <Button
                        variant="outline"
                        className="w-full rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        render={<a href="#about" />}
                    >
                        Our mission
                    </Button>
                    <Button
                        className="w-full rounded-md bg-slate-900 text-white hover:bg-slate-800"
                        render={<a href="#waitlist" />}
                    >
                        Join waitlist
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}