import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Sidebar from "./sidebar";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Who it's for", href: "#who-its-for" },
  { label: "Our values", href: "#our-values" },
];

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto max-w-7xl">
        <div className="h-14 md:h-16 rounded-2xl border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_10px_30px_rgba(16,42,67,0.08)] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 lg:gap-10 min-w-0">
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="OurProps">
              <Image src="/logo.png" alt="OurProps Logo" width={32} height={32} className="h-8 w-auto object-contain" />
              <span className="text-lg font-semibold text-slate-900 tracking-tight sm:flex hidden">OurProps</span>
            </Link>

            <div className="hidden lg:inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <ShieldCheck size={14} className="text-emerald-600" />
              Built for secure ownership in Ghana &amp; West Africa
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex h-9 rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              render={<a href="#about" />}
            >
              Our mission
            </Button>
            <Button
              size="sm"
              className="h-9 px-4 sm:px-5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
              render={<a href="#waitlist" />}
            >
              Join waitlist
            </Button>

            <Sidebar />
          </div>
        </div>
      </div>
    </header>
  );
}
