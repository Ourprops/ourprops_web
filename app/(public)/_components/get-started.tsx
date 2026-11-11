import { ArrowRight } from "lucide-react"
import Link from "next/link"

import type { HomeContent } from "@/lib/content/defaults"
import { Eyebrow } from "./section-heading"

// The last section of the homepage and of each page about OurProps: one clear next step, to register.
// A full orange block with ink text (6.9:1), the loudest thing on the page, as Figma ends on a bold colour block.
export default function GetStarted({ content }: { content: HomeContent["getStarted"] }) {
	const { eyebrow, heading, description } = content.header

	return (
		<section className="w-full py-6 md:py-10" aria-labelledby="get-started-title">
			<div className="mx-auto max-w-310 px-3 sm:px-5 md:px-8">
				<div className="block-panel survey-grid relative overflow-hidden bg-secondary px-6 py-16 text-center text-ink [--grid-line:rgba(11,30,51,0.07)] sm:px-10 md:py-28">
					<Eyebrow className="bg-ink/10 [&>span]:bg-ink">{eyebrow}</Eyebrow>
					<h2 id="get-started-title" className="text-hero mx-auto mt-5 max-w-4xl">
						{heading}
					</h2>
					<p className="text-lead mx-auto mt-6 max-w-xl text-ink/80">{description}</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link
							href={content.button.href}
							className="pressable inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink px-7 text-base font-semibold text-white hover:bg-ink/90 focus-visible:ring-3 focus-visible:ring-ink/40 focus-visible:outline-none sm:w-auto"
						>
							{content.button.label}
							<ArrowRight size={16} aria-hidden />
						</Link>
						<Link href="/account/login" className="px-3 py-2 text-base font-semibold text-ink underline-offset-4 hover:underline">
							Already registered? Sign in
						</Link>
					</div>
				</div>
			</div>
		</section>
	)
}
