import { Check } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"
import { cn } from "@/lib/utils"
import SectionHeading from "./section-heading"

// One colour block per card, in order, like Figma's coloured feature tiles
const BLOCKS = ["bg-block-orange", "bg-block-sky", "bg-block-mint"]

// The problem, stated big, then what OurProps changes, as three colour blocks
export default function ValueProposition({ content }: { content: HomeContent["valueProposition"] }) {
	return (
		<section className="w-full py-24 md:py-36">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading {...content.header} />

				<ol className="mt-14 grid grid-cols-1 gap-4 md:mt-20 md:grid-cols-3 md:gap-5">
					{content.items.map((item, index) => (
						<li key={item.title} className={cn("block-panel flex flex-col p-7 md:p-8", BLOCKS[index % BLOCKS.length])}>
							<span className="text-data text-6xl font-medium tracking-tighter text-ink/25 md:text-7xl" aria-hidden>
								{String(index + 1).padStart(2, "0")}
							</span>
							<h3 className="mt-10 text-2xl font-bold tracking-tight text-ink md:text-[1.75rem] md:leading-tight">{item.title}</h3>
							<p className="mt-3 flex-1 text-base leading-relaxed text-ink/75">{item.description}</p>
							<p className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink">
								<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
									<Check size={12} strokeWidth={3} aria-hidden />
								</span>
								{item.highlight}
							</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	)
}
