import { Building2, CheckCircle2, Compass, FolderOpen } from "lucide-react"

const VALUE_PROPS = [
	{
		icon: Compass,
		title: "Verify ownership before you transact",
		description:
			"Reduce fraudulent sales and overlapping claims with clearer ownership context, mapped boundaries, and supporting records.",
		highlight: "Ownership-first verification workflow",
	},
	{
		icon: FolderOpen,
		title: "Secure documents and property history",
		description:
			"Store deeds, plans, receipts, and identity filings in one organized system with stronger visibility control and peace of mind.",
		highlight: "Centralized and secure record repository",
	},
	{
		icon: Building2,
		title: "Collaborate across owners, seekers, and agents",
		description:
			"Share trusted property information with clients, families, legal teams, and professionals to make transactions faster and more reliable.",
		highlight: "Community-driven, trust-based transactions",
	},
]

export default function ValueProposition() {
	return (
		<section className="w-full bg-card py-14 sm:py-20 md:py-28">
			<div className="max-w-310 mx-auto px-4 md:px-8">
				<div className="max-w-3xl mb-10 sm:mb-14">
					<h2 className="text-3xl sm:text-4xl md:text-5xl text-foreground font-semibold tracking-tight text-balance">
						Real estate progress should not be blocked by disputes and uncertainty.
					</h2>
					<p className="text-base sm:text-lg text-muted-foreground mt-3">
						OurProps combines verification, documentation, and property context
						into one platform built for Ghana and the broader West African market.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
					{VALUE_PROPS.map((item) => {
						const Icon = item.icon

						return (
							<article
								key={item.title}
								className="bg-background p-5 sm:p-6 md:p-8 rounded-xl border border-border flex flex-col justify-between hover:bg-muted transition-all"
							>
								<div>
									<div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mb-5 sm:mb-6">
										<Icon size={22} />
									</div>
									<h3 className="text-xl sm:text-2xl text-foreground font-semibold mb-3">
										{item.title}
									</h3>
									<p className="text-sm sm:text-base text-muted-foreground">
										{item.description}
									</p>
								</div>

								<div className="pt-5 sm:pt-6 mt-5 sm:mt-6 border-t border-border flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
									<CheckCircle2 size={16} className="text-secondary shrink-0" />
									<span>{item.highlight}</span>
								</div>
							</article>
						)
					})}
				</div>
			</div>
		</section>
	)
}
