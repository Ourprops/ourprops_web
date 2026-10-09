import { ArrowRight } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"
import { getIcon } from "./icons"
import SectionHeading from "./section-heading"

export default function Audience({ content }: { content: HomeContent["audience"] }) {
	return (
		<section className="w-full py-20 md:py-28" id="who-its-for">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading {...content.header} />

				<div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
					{content.items.map((item) => {
						const Icon = getIcon(item.icon)

						return (
							<a
								key={item.title}
								href={item.cta.href}
								className="pressable group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-xs transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:p-8"
							>
								<span className="flex size-11 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border">
									<Icon size={20} aria-hidden />
								</span>
								<h3 className="text-heading mt-6 text-foreground">{item.title}</h3>
								<p className="mt-3 flex-1 text-base leading-relaxed text-copy">{item.description}</p>
								<span className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-secondary">
									{item.cta.label}
									<ArrowRight
										size={16}
										className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
										aria-hidden
									/>
								</span>
							</a>
						)
					})}
				</div>
			</div>
		</section>
	)
}
