import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import type { HomeContent } from "@/lib/content/defaults"

// The last section of the homepage and of each page about OurProps: one clear next step, to register.
// A navy panel on the page background, so it sits well after any section, the navy values one included.
export default function GetStarted({ content }: { content: HomeContent["getStarted"] }) {
	const { eyebrow, heading, description } = content.header

	return (
		<section className="w-full py-16 md:py-24" aria-labelledby="get-started-title">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<div className="survey-grid relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-card [--grid-line:rgba(255,255,255,0.05)] sm:px-10 md:py-16">
					<p className="text-eyebrow text-secondary">{eyebrow}</p>
					<h2 id="get-started-title" className="text-title mx-auto mt-3 max-w-2xl">
						{heading}
					</h2>
					<p className="text-lead mx-auto mt-4 max-w-xl text-white/75">{description}</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link
							href={content.button.href}
							className={buttonVariants({ variant: "cta", size: "lg", className: "pressable h-12 w-full px-6 text-[15px] sm:w-auto" })}
						>
							{content.button.label}
							<ArrowRight size={16} aria-hidden />
						</Link>
						<Link href="/account/login" className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white">
							Already registered? Sign in
						</Link>
					</div>
				</div>
			</div>
		</section>
	)
}
