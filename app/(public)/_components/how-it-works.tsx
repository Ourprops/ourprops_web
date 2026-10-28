import { Check } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"
import { cn } from "@/lib/utils"
import { SAMPLE_PROPERTY } from "./property-record"
import SectionHeading from "./section-heading"

export default function HowItWorks({ content }: { content: HomeContent["howItWorks"] }) {
	return (
		<section className="w-full py-20 md:py-28" id="how-it-works">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading {...content.header} />

				<ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
					{content.steps.map((step, index) => (
						<li key={step.title} className="flex flex-col">
							{/* The same record at this step, so the steps read as one record filling in */}
							<RecordAtStage stage={Math.min(index + 1, 3)} />
							<p className="text-data mt-6 text-sm text-secondary">
								{String(index + 1).padStart(2, "0")}
							</p>
							<h3 className="text-heading mt-2 text-foreground">{step.title}</h3>
							<p className="mt-2 text-base leading-relaxed text-copy">{step.description}</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	)
}

// A small picture of the sample record after `stage` steps. Decorative: the step text says the same thing.
function RecordAtStage({ stage }: { stage: number }) {
	const mapped = stage >= 2
	const documented = stage >= 3

	return (
		<div className="survey-grid rounded-xl border border-border p-4" aria-hidden>
			<div className="rounded-lg border border-border bg-card p-3.5 shadow-xs">
				<div className="flex items-center justify-between gap-2">
					<p className="truncate text-sm font-semibold text-foreground">{SAMPLE_PROPERTY.name}</p>
					<span className="text-data shrink-0 text-[10px] text-muted-foreground">{SAMPLE_PROPERTY.digitalAddress}</span>
				</div>
				<p className="mt-0.5 text-xs text-copy">
					{SAMPLE_PROPERTY.type} · {SAMPLE_PROPERTY.location}
				</p>

				<div
					className={cn(
						"mt-3 h-20 overflow-hidden rounded-md",
						mapped ? "bg-[#EEF2F6]" : "border border-dashed border-border bg-background"
					)}
				>
					{mapped ? (
						<svg className="size-full" viewBox="0 0 200 80" preserveAspectRatio="xMidYMid slice">
							<g fill="#E1E7EF">
								<path d="M8 4h44l-2 24H6z" />
								<path d="M150 4h44v26h-46z" />
								<path d="M10 50h40l-2 28H8z" />
								<path d="M150 50h44v28h-46z" />
							</g>
							<path d="M-4 38C60 32 120 44 204 36" stroke="#FFFFFF" strokeWidth="7" fill="none" />
							<path
								d="M66 10l66 3-4 52-64-4z"
								fill="rgba(255,107,53,0.14)"
								stroke="#FF6B35"
								strokeWidth="1.75"
								strokeLinejoin="round"
							/>
						</svg>
					) : (
						<p className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
							No boundary yet
						</p>
					)}
				</div>

				<ul className="mt-3 flex flex-col gap-1.5">
					{["Indenture", "Site plan"].map((name) => (
						<li key={name} className="flex items-center justify-between gap-2 text-xs">
							{documented ? (
								<>
									<span className="text-foreground">{name}</span>
									<span className="inline-flex items-center gap-0.5 text-success">
										<Check size={11} strokeWidth={3} />
										Added
									</span>
								</>
							) : (
								<>
									<span className="h-2 w-20 rounded-full bg-border" />
									<span className="text-muted-foreground">Not added</span>
								</>
							)}
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
