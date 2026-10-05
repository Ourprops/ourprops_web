import { FolderUp, Share2, SquarePlus } from "lucide-react"

const STEPS = [
	{
		number: "01",
		title: "Add",
		description:
			"Add the relevant information about a property. Input cadastral numbers, physical location, size, and essential profile parameters.",
		icon: SquarePlus,
	},
	{
		number: "02",
		title: "Organize",
		description:
			"Keep property information and supporting documents together. Attach site plans, verified survey records, clearances, and notes securely.",
		icon: FolderUp,
	},
	{
		number: "03",
		title: "Access",
		description:
			"View and share property information when needed. Deliver clear, organized records directly to family members, lawyers, or prospective buyers.",
		icon: Share2,
	},
]

export default function HowItWorks() {
	return (
		<section className="w-full py-14 sm:py-20 md:py-28" id="how-it-works">
			<div className="max-w-310 mx-auto px-4 md:px-8">
				<div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 md:mb-16">
					<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						Workflow
					</span>
					<h2 className="text-3xl sm:text-4xl md:text-5xl text-foreground font-semibold mt-2 text-balance">
						How OurProps works
					</h2>
					<p className="text-sm sm:text-base text-muted-foreground mt-2">
						A dependable, step-by-step process designed to eliminate confusion
						and fragmented files.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
					{STEPS.map((step) => {
						const Icon = step.icon

						return (
							<article
								key={step.number}
								className="bg-card p-5 sm:p-6 md:p-8 rounded-xl border border-border relative shadow-xs"
							>
								<div className="flex items-center justify-between mb-5 sm:mb-6">
									<span className="text-4xl sm:text-5xl font-bold text-primary/20 leading-none">
										{step.number}
									</span>
									<span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground">
										<Icon size={20} />
									</span>
								</div>
								<h3 className="text-xl sm:text-2xl text-foreground font-semibold mb-2">
									{step.title}
								</h3>
								<p className="text-sm sm:text-base text-muted-foreground">
									{step.description}
								</p>
							</article>
						)
					})}
				</div>
			</div>
		</section>
	)
}
