import Image from "next/image";
import Link from "next/link";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For property owners", href: "#for-property-owners" },
  { label: "For buyers", href: "#for-buyers" },
];

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="h-16 md:h-20 max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2" aria-label="OurProps">
            <Image src="/logo.png" alt="OurProps Logo" width={32} height={32} className="h-8 w-auto object-contain" />
            <span className="text-lg font-semibold text-slate-900 tracking-tight sm:flex hidden">OurProps</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <Button size="sm" className="h-11 px-6 rounded-lg bg-orange-500 text-white hover:bg-orange-600" render={<a href="#waitlist" />}>
              Join the waitlist
            </Button>
            {/* <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
            <User className="text-white" size={18} />
          </div> */}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </Button>
        </div>
      </div>
    </header>
  );
}
