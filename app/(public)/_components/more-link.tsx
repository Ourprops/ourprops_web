import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

// "Learn more" at the end of a homepage section, to the page that tells the whole story
export default function MoreLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    return (
        <Link
            href={href}
            className={cn(
                "group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-secondary",
                className
            )}
        >
            {children}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </Link>
    )
}
