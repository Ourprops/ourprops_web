import Image from "next/image"
import Link from "next/link"

const FOOTER_LINKS = [
	{ label: "About", href: "#about" },
	{ label: "How it works", href: "#how-it-works" },
	{ label: "Who it's for", href: "#who-its-for" },
	{ label: "Our values", href: "#our-values" },
	{ label: "Waitlist", href: "#waitlist" },
	{ label: "Privacy", href: "#" },
	{ label: "Terms", href: "#" },
]

export default function Footer() {
	return (
		<footer className="w-full bg-primary text-primary-foreground">
			<div className="max-w-310 mx-auto px-4 md:px-8 py-8 sm:py-10">
				<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
					<div className="flex flex-col gap-1">
						<Link href="/" className="flex items-center gap-2" aria-label="OurProps home">
							<Image
								alt="OurProps Logo"
								src="/logo.png"
								width={28}
								height={28}
								className="h-7 w-auto object-contain"
							/>
							<span className="text-lg font-semibold tracking-tight text-white">OurProps</span>
						</Link>
						<p className="text-sm text-white/70">Secure, transparent property ownership.</p>
					</div>

					<nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
						{FOOTER_LINKS.map((link) => (
							<a
								key={link.label}
								href={link.href}
								className="text-sm text-white/70 hover:text-white transition-colors"
							>
								{link.label}
							</a>
						))}
					</nav>
				</div>

				<div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-white/70 text-xs sm:text-sm">
					<p>© 2026 OurProps Inc. All rights reserved.</p>
					<p className="text-white/60">Built for conflict-free property transactions across Africa.</p>
				</div>
			</div>
		</footer>
	)
}
