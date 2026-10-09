import Image from "next/image"
import Link from "next/link"

import type { SiteContent } from "@/lib/content/defaults"

type FooterProps = Pick<SiteContent, "footerTagline" | "footerLinks" | "footerNote" | "companyName">

export default function Footer({ footerTagline, footerLinks, footerNote, companyName }: FooterProps) {
	return (
		<footer className="w-full border-t border-white/10 bg-primary text-primary-foreground">
			<div className="mx-auto max-w-310 px-5 py-12 md:px-8">
				<div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
					<div>
						<Link href="/" className="flex items-center gap-2" aria-label="OurProps home">
							<Image alt="" src="/logo.png" width={28} height={28} className="h-7 w-auto object-contain" />
							<span className="text-lg font-semibold tracking-tight text-white">OurProps</span>
						</Link>
						<p className="mt-2 text-sm text-white/70">{footerTagline}</p>
					</div>

					<nav aria-label="Footer">
						<ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
							{footerLinks.map((link) => (
								<li key={link.label}>
									<a href={link.href} className="text-sm text-white/75 transition-colors hover:text-white">
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				</div>

				<div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center">
					<p>© {new Date().getFullYear()} {companyName} All rights reserved.</p>
					<p>{footerNote}</p>
				</div>
			</div>
		</footer>
	)
}
