import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react"

import { ACCESS_LEVELS, type AccessLevel, type HomeContent } from "@/lib/content/defaults"
import { cn } from "@/lib/utils"
import { SAMPLE_PROPERTY } from "./property-record"
import SectionHeading from "./section-heading"

type Visibility = "visible" | "status" | "hidden"

// The parts of the sample record, and how much of each one a person with that access level sees
const RECORD_PARTS: { name: string; access: Record<AccessLevel, Visibility> }[] = [
	{ name: "Location", access: { full: "visible", summary: "visible", documents: "visible" } },
	{ name: "Mapped boundary", access: { full: "visible", summary: "visible", documents: "hidden" } },
	{ name: "Indenture", access: { full: "visible", summary: "status", documents: "visible" } },
	{ name: "Site plan", access: { full: "visible", summary: "status", documents: "visible" } },
	{ name: "Receipts", access: { full: "visible", summary: "hidden", documents: "hidden" } },
]

const ACCESS_LABELS: Record<AccessLevel, string> = {
	full: "Whole record",
	summary: "Summary",
	documents: "Documents",
}

const VISIBILITY: Record<Visibility, { label: string; icon: typeof Eye; className: string }> = {
	visible: { label: "Visible", icon: Eye, className: "text-success" },
	status: { label: "Status only", icon: Lock, className: "text-warning" },
	hidden: { label: "Hidden", icon: EyeOff, className: "text-muted-foreground" },
}

// Sanity restricts the field to these values, but an unexpected one shouldn't break the page
function toAccessLevel(value: string): AccessLevel {
	return (ACCESS_LEVELS as readonly string[]).includes(value) ? (value as AccessLevel) : "summary"
}

export default function Audience({ content }: { content: HomeContent["audience"] }) {
	return (
		<section className="w-full py-20 md:py-28" id="who-its-for">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading {...content.header} />

				<div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
					{content.items.map((item) => (
						<a
							key={item.title}
							href={item.cta.href}
							className="pressable group flex flex-col rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:p-6"
						>
							<RecordView level={toAccessLevel(item.accessLevel)} />
							<h3 className="text-heading mt-6 text-foreground">{item.title}</h3>
							<p className="mt-2 flex-1 text-base leading-relaxed text-copy">{item.description}</p>
							<span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-secondary">
								{item.cta.label}
								<ArrowRight
									size={16}
									className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
									aria-hidden
								/>
							</span>
						</a>
					))}
				</div>
			</div>
		</section>
	)
}

// The sample record as this person sees it. Decorative: the card's text describes who it's for.
function RecordView({ level }: { level: AccessLevel }) {
	return (
		<div className="overflow-hidden rounded-lg border border-border bg-background" aria-hidden>
			<div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
				<span className="truncate text-xs font-semibold text-foreground">{SAMPLE_PROPERTY.name}</span>
				<span className="text-data shrink-0 text-[10px] text-muted-foreground">{ACCESS_LABELS[level]}</span>
			</div>
			<ul className="divide-y divide-border">
				{RECORD_PARTS.map((part) => {
					const visibility = VISIBILITY[part.access[level]]

					return (
						<li key={part.name} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
							<span className={cn(part.access[level] === "hidden" ? "text-muted-foreground line-through decoration-border" : "text-foreground")}>
								{part.name}
							</span>
							<span className={cn("inline-flex items-center gap-1", visibility.className)}>
								<visibility.icon size={11} strokeWidth={2.5} />
								{visibility.label}
							</span>
						</li>
					)
				})}
			</ul>
		</div>
	)
}
