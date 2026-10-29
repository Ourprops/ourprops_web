import { Check } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"
import SectionHeading from "./section-heading"

// The problem on the left, what OurProps changes as numbered entries on the right, like clauses in a document
export default function ValueProposition({ content }: { content: HomeContent["valueProposition"] }) {
	return (
		<section className="w-full bg-card py-20 md:py-28">
			<div className="mx-auto grid max-w-310 grid-cols-1 gap-12 px-5 md:px-8 lg:grid-cols-12 lg:gap-16">
				<SectionHeading className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start" {...content.header} />

				<ol className="divide-y divide-border border-y border-border lg:col-span-7">
					{content.items.map((item, index) => (
						<li key={item.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 py-8 sm:grid-cols-[3.5rem_1fr]">
							<span className="text-data pt-1 text-sm text-secondary" aria-hidden>
								{String(index + 1).padStart(2, "0")}
							</span>
							<div>
								<h3 className="text-heading text-foreground">{item.title}</h3>
								<p className="mt-3 text-base leading-relaxed text-copy">{item.description}</p>
								<p className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
									<Check size={16} strokeWidth={2.5} className="shrink-0 text-success" aria-hidden />
									{item.highlight}
								</p>
							</div>
						</li>
					))}
				</ol>
			</div>
		</section>
	)
}
