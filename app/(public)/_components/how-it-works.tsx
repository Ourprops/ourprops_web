import type { HomeContent } from "@/lib/content/defaults"
import { getIcon } from "./icons"
import SectionHeading from "./section-heading"

export default function HowItWorks({ content }: { content: HomeContent["howItWorks"] }) {
	return (
		<section className="w-full py-20 md:py-28" id="how-it-works">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading align="center" {...content.header} />

				{/* The ::before line connects the step markers on wide screens */}
				<ol className="relative mt-14 grid grid-cols-1 gap-10 before:absolute before:left-[16.66%] before:right-[16.66%] before:top-6 before:hidden before:h-px before:bg-border md:grid-cols-3 md:gap-8 md:before:block">

					{content.steps.map((step, index) => {
						const Icon = getIcon(step.icon)

						return (
							<li key={step.title} className="relative flex flex-col items-center text-center">
								<span className="relative flex size-12 items-center justify-center rounded-full border border-border bg-card text-primary shadow-xs">
									<Icon size={20} aria-hidden />
								</span>
								<p className="text-eyebrow mt-6 text-muted-foreground">
									Step {String(index + 1).padStart(2, "0")}
								</p>
								<h3 className="text-heading mt-2 text-foreground">{step.title}</h3>
								<p className="mt-3 max-w-xs text-base leading-relaxed text-copy">{step.description}</p>
							</li>
						)
					})}
				</ol>
			</div>
		</section>
	)
}
