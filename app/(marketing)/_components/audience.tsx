import { ArrowRight, BriefcaseBusiness, House, Search } from "lucide-react"

const AUDIENCE = [
	{
		title: "Property Owners",
		description:
			"Define and map boundaries, upload ownership documents, and control who can view your records.",
		cta: "For owners",
		icon: House,
	},
	{
		title: "Seekers (Buyers & Families)",
		description:
			"Verify land and property ownership before committing, so you can avoid fraudulent transactions and costly disputes.",
		cta: "For seekers",
		icon: Search,
	},
	{
		title: "Agents & Professionals",
		description:
			"Manage listings, coordinate with clients, and run transactions with trusted data and organized documentation.",
		cta: "For professionals",
		icon: BriefcaseBusiness,
	},
]

export default function Audience() {
	return (
		<section className="w-full py-14 sm:py-20 md:py-28" id="who-its-for">
			<div className="max-w-310 mx-auto px-4 md:px-8">
				<div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 md:mb-16">
					<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						Who It Is For
					</span>
					<h2 className="text-3xl sm:text-4xl md:text-5xl text-foreground font-semibold mt-2 text-balance">
						Designed for everyone involved in property.
					</h2>
					<p className="text-sm sm:text-base text-muted-foreground mt-2">
						Structured documentation benefits every stakeholder across the
						lifecycle of land and home ownership.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
					{AUDIENCE.map((item) => {
						const Icon = item.icon

						return (
							<article
								key={item.title}
								className="bg-card p-5 sm:p-6 md:p-8 rounded-xl border border-border flex flex-col justify-between shadow-xs"
							>
								<div>
									<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary mb-5 sm:mb-6">
										<Icon size={22} />
									</div>
									<h3 className="text-xl sm:text-2xl text-foreground font-semibold mb-3">
										{item.title}
									</h3>
									<p className="text-sm sm:text-base text-muted-foreground">
										{item.description}
									</p>
								</div>

								<div className="pt-6 sm:pt-8 mt-5 sm:mt-6 border-t border-border">
									<a
										href="#waitlist"
										className="inline-flex items-center gap-1.5 text-primary font-semibold hover:text-secondary transition-colors"
									>
										{item.cta}
										<ArrowRight size={16} />
									</a>
								</div>
							</article>
						)
					})}
				</div>
			</div>
		</section>
	)
}
