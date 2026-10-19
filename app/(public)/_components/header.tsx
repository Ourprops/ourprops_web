import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Link as NavLink } from "@/lib/content/defaults";
import Sidebar from "./sidebar";

type HeaderProps = {
  navigation: NavLink[];
  cta: NavLink;
};

export default function Header({ navigation, cta }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className="material mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-2xl border border-white/60 px-3 shadow-[0_8px_24px_-12px_rgba(16,42,67,0.18)] sm:px-4 md:h-16 md:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md" aria-label="OurProps home">
          <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" priority />
          <span className="text-lg font-semibold tracking-tight text-primary">OurProps</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navigation.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-copy transition-colors hover:bg-background hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            className="pressable h-9 rounded-lg bg-secondary px-4 text-secondary-foreground hover:bg-secondary/90"
            render={<a href={cta.href} />}
            nativeButton={false}
          >
            {cta.label}
          </Button>
          <Sidebar navigation={navigation} cta={cta} />
        </div>
      </div>
    </header>
  );
}
