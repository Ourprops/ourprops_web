import { ArrowRight, Eye, Lock } from "lucide-react"
import Link from "next/link"

import { ACCESS_LEVELS, type AccessLevel, type HomeContent } from "@/lib/content/defaults"
import { cn } from "@/lib/utils"
import MoreLink from "./more-link"
import { SAMPLE_PROPERTY } from "./property-record"
import SectionHeading from "./section-heading"
import { reveal } from "@/lib/reveal"

type Visibility = "visible" | "status" | "hidden"

const AUDIENCE_BLOCKS = ["bg-block-orange", "bg-block-sky", "bg-block-sand"]

// The parts of the sample record, and what each person sees of them. As OurProps works today: the owner sees their own
// record, documents included; everyone else sees the public record, which shows the area and what was checked, and
// never the documents or the exact boundary (app/(public)/record). "summary" and "documents" are both the public record.
const RECORD_PARTS: { name: string; access: Record<AccessLevel, Visibility> }[] = [
	{ name: "General area", access: { full: "visible", summary: "visible", documents: "visible" } },
	{ name: "What we checked", access: { full: "visible", summary: "visible", documents: "visible" } },
	{ name: "Exact boundary", access: { full: "visible", summary: "hidden", documents: "hidden" } },
	{ name: "Indenture", access: { full: "visible", summary: "hidden", documents: "hidden" } },
	{ name: "Site plan", access: { full: "visible", summary: "hidden", documents: "hidden" } },
]

const ACCESS_LABELS: Record<AccessLevel, string> = {
	full: "Your account",
	summary: "Public record",
	documents: "Public record",
}

const VISIBILITY: Record<Visibility, { label: string; icon: typeof Eye; className: string }> = {
	visible: { label: "Visible", icon: Eye, className: "text-success" },
	status: { label: "Status only", icon: Lock, className: "text-warning" },
	hidden: { label: "Private", icon: Lock, className: "text-muted-foreground" },
}

// Sanity restricts the field to these values, but an unexpected one shouldn't break the page
function toAccessLevel(value: string): AccessLevel {
	return (ACCESS_LEVELS as readonly string[]).includes(value) ? (value as AccessLevel) : "summary"
}

type AudienceProps = {
	content: HomeContent["audience"]
	/** "home": short cards and a link on to /who-its-for. "page": opens /who-its-for, with each person's view of the record */
	variant?: "home" | "page"
}

export default function Audience({ content, variant = "home" }: AudienceProps) {
	const page = variant === "page"

	return (
		<section className="w-full py-24 md:py-36" id="who-its-for">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading as={page ? "h1" : "h2"} {...content.header} />

				<ul className="mt-14 grid grid-cols-1 gap-4 md:mt-20 md:grid-cols-3 md:gap-5">
					{content.items.map((item, index) => (
						// The card isn't a link; only its button is, so the link reads as one clear phrase
						<li key={item.title} {...reveal(index)} className={cn("block-panel flex flex-col p-6 md:p-8", AUDIENCE_BLOCKS[index % AUDIENCE_BLOCKS.length])}>
							{page ? <RecordView level={toAccessLevel(item.accessLevel)} /> : null}
							<h3 className={cn("text-2xl font-bold tracking-tight text-ink", page && "mt-6")}>{item.title}</h3>
							<p className="mt-3 flex-1 text-base leading-relaxed text-ink/75">{item.description}</p>
							<Link
								href={item.cta.href}
								className="pressable group mt-7 inline-flex h-11 w-fit items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90"
							>
								{item.cta.label}
								<ArrowRight
									size={16}
									className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
									aria-hidden
								/>
							</Link>
						</li>
					))}
				</ul>

				{page ? null : <MoreLink href="/who-its-for" className="mt-10">What each person sees</MoreLink>}
			</div>
		</section>
	)
}

// The sample record as this person sees it. Decorative: the card's text describes who it's for.
function RecordView({ level }: { level: AccessLevel }) {
	return (
		<div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-ink/5" aria-hidden>
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
