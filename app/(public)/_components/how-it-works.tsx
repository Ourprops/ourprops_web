import { BadgeCheck, Check, Link2 } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"
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

// The sample record at each step: registered and mapped, then documents in and being checked, then verified and
// ready to share. Decorative: the step text says the same thing.
function RecordAtStage({ stage }: { stage: number }) {
	const checking = stage >= 2
	const verified = stage >= 3

	return (
		<div className="survey-grid rounded-xl border border-border p-4" aria-hidden>
			<div className="rounded-lg border border-border bg-card p-3.5 shadow-xs">
				<div className="flex items-center justify-between gap-2">
					<p className="truncate text-sm font-semibold text-foreground">{SAMPLE_PROPERTY.name}</p>
					{verified ? (
						<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
							<BadgeCheck size={11} /> Verified
						</span>
					) : (
						<span className="text-data shrink-0 text-[10px] text-muted-foreground">{checking ? "Being checked" : "Registered"}</span>
					)}
				</div>
				<p className="mt-0.5 text-xs text-copy">
					{SAMPLE_PROPERTY.type} · {SAMPLE_PROPERTY.location}
				</p>

				{/* the mapped plot, from the first step */}
				<div className="mt-3 h-16 overflow-hidden rounded-md bg-[#EEF2F6]">
					<svg className="size-full" viewBox="0 0 200 64" preserveAspectRatio="xMidYMid slice">
						<g fill="#E1E7EF">
							<path d="M8 4h44l-2 20H6z" />
							<path d="M150 4h44v22h-46z" />
							<path d="M10 40h40l-2 22H8z" />
							<path d="M150 40h44v22h-46z" />
						</g>
						<path d="M-4 31C60 26 120 36 204 29" stroke="#FFFFFF" strokeWidth="6" fill="none" />
						<path d="M66 8l66 3-4 42-64-3z" fill="rgba(255,107,53,0.14)" stroke="#FF6B35" strokeWidth="1.75" strokeLinejoin="round" />
					</svg>
				</div>

				{verified ? (
					// the shared public record: what was checked, never the documents
					<div className="mt-3 flex items-center gap-2 rounded-md bg-background px-2.5 py-2 text-xs">
						<Link2 size={13} className="shrink-0 text-primary" />
						<span className="text-data truncate text-copy">…/record/PROP-x7Kd2q</span>
						<span className="ml-auto shrink-0 font-medium text-primary">Share</span>
					</div>
				) : (
					<ul className="mt-3 flex flex-col gap-1.5">
						{["Ownership documents", "Boundary", "Overlapping claims"].map((name, index) => (
							<li key={name} className="flex items-center justify-between gap-2 text-xs">
								{checking ? (
									<>
										<span className="text-foreground">{name}</span>
										{index < 2 ? (
											<span className="inline-flex items-center gap-0.5 text-success">
												<Check size={11} strokeWidth={3} />
												Checked
											</span>
										) : (
											<span className="text-primary">Checking…</span>
										)}
									</>
								) : (
									<>
										<span className="h-2 w-20 rounded-full bg-border" />
										<span className="text-muted-foreground">Not yet</span>
									</>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}
