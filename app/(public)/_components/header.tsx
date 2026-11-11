import Image from "next/image";
import Link from "next/link";
import type { Link as NavLink } from "@/lib/content/defaults";
import Sidebar from "./sidebar";

type HeaderProps = {
  navigation: NavLink[];
  cta: NavLink;
};

export default function Header({ navigation, cta }: HeaderProps) {
  return (
    // A plain full-width bar with a hairline edge, like the header of a document
    <header className="material fixed inset-x-0 top-0 z-50 border-b border-border">
      <div className="mx-auto flex h-16 max-w-310 items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md" aria-label="OurProps home">
          <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" priority />
          <span className="text-lg font-bold tracking-tight text-ink">OurProps</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navigation.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink/75 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {/* for owners who already have an account; on a phone it's in the menu */}
          <Link
            href="/account/login"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 sm:block"
          >
            Sign in
          </Link>
          <Link
            href={cta.href}
            className="pressable inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {cta.label}
          </Link>
          <Sidebar navigation={navigation} cta={cta} />
        </div>
      </div>
    </header>
  );
}
