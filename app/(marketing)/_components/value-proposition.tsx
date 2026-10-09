import { Check } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"
import { getIcon } from "./icons"
import SectionHeading from "./section-heading"

export default function ValueProposition({ content }: { content: HomeContent["valueProposition"] }) {
	return (
		<section className="w-full bg-card py-20 md:py-28">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading {...content.header} />

				<div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
					{content.items.map((item) => {
						const Icon = getIcon(item.icon)

						return (
							<article key={item.title} className="flex flex-col border-t border-border pt-8">
								<span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
									<Icon size={20} aria-hidden />
								</span>
								<h3 className="text-heading mt-6 text-foreground">{item.title}</h3>
								<p className="mt-3 text-base leading-relaxed text-copy">{item.description}</p>
								<p className="mt-5 flex items-center gap-2 text-sm font-medium text-foreground">
									<Check size={16} strokeWidth={2.5} className="shrink-0 text-secondary" aria-hidden />
									{item.highlight}
								</p>
							</article>
						)
					})}
				</div>
			</div>
		</section>
	)
}
