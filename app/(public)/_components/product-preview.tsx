import { ChevronRight, Eye, FileText, Image as ImageIcon, Lock, Map, ShieldCheck } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"
import { getIcon } from "./icons"

import {
	BoundaryMap,
	DocumentRow,
	InfoRow,
	PropertyHeader,
	SAMPLE_PROPERTY,
} from "./property-record"
import SectionHeading from "./section-heading"

const SHARED_WITH = [
	{ initials: "AM", name: "Ama Mensah", role: "Lawyer", access: "Documents" },
	{ initials: "KB", name: "Kofi Boateng", role: "Prospective buyer", access: "Summary only" },
]

export default function ProductPreview({ content }: { content: HomeContent["productPreview"] }) {
	return (
		<section className="w-full bg-card py-20 md:py-28" id="product">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<SectionHeading align="center" {...content.header} />

				{/* Decorative product preview: hidden from assistive tech, the callouts below describe it */}
				<div
					className="mt-14 overflow-hidden rounded-3xl border border-border bg-background shadow-[0_1px_2px_rgba(16,42,67,0.04),0_32px_64px_-32px_rgba(16,42,67,0.25)]"
					aria-hidden
					inert
				>
					<div className="flex items-center gap-1.5 border-b border-border bg-card px-5 py-3 text-xs text-muted-foreground">
						<span>Properties</span>
						<ChevronRight size={12} />
						<span className="font-medium text-foreground">{SAMPLE_PROPERTY.name}</span>
					</div>

					<div className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-12">
						<div className="flex flex-col gap-5 lg:col-span-7">
							<div className="rounded-2xl border border-border bg-card p-5">
								<PropertyHeader
									name={SAMPLE_PROPERTY.name}
									type={SAMPLE_PROPERTY.type}
									location={SAMPLE_PROPERTY.location}
									status={SAMPLE_PROPERTY.status}
								/>
								<dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3">
									{SAMPLE_PROPERTY.details.map((detail) => (
										<InfoRow key={detail.label} {...detail} />
									))}
								</dl>
							</div>
							<BoundaryMap className="h-64 sm:h-80 lg:flex-1" coordinates={SAMPLE_PROPERTY.coordinates} />
						</div>

						<div className="flex flex-col gap-5 lg:col-span-5">
							<div className="rounded-2xl border border-border bg-card p-5">
								<p className="text-sm font-semibold text-foreground">Documents</p>
								<ul className="mt-1 divide-y divide-border">
									<DocumentRow icon={FileText} name="Ownership document" detail="Land deed · PDF" status="complete" />
									<DocumentRow icon={Map} name="Site plan" detail="Surveyor coordinate sheet" status="in-review" />
									<DocumentRow icon={ShieldCheck} name="Supporting document" detail="Municipal confirmation" status="complete" />
									<DocumentRow icon={ImageIcon} name="Property photos" detail="6 images" status="pending" />
								</ul>
							</div>

							<div className="rounded-2xl border border-border bg-card p-5">
								<div className="flex items-center justify-between">
									<p className="text-sm font-semibold text-foreground">Shared with</p>
									<span className="inline-flex items-center gap-1 text-xs text-copy">
										<Lock size={12} />
										Private by default
									</span>
								</div>
								<ul className="mt-3 flex flex-col gap-3">
									{SHARED_WITH.map((person) => (
										<li key={person.name} className="flex items-center gap-3">
											<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
												{person.initials}
											</span>
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-medium text-foreground">{person.name}</span>
												<span className="block truncate text-xs text-muted-foreground">{person.role}</span>
											</span>
											<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs text-copy ring-1 ring-border">
												<Eye size={12} />
												{person.access}
											</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</div>

				<ul className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
					{content.callouts.map((callout) => {
						const Icon = getIcon(callout.icon)

						return (
							<li key={callout.title} className="flex gap-4">
								<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border">
									<Icon size={18} aria-hidden />
								</span>
								<div>
									<h3 className="text-base font-semibold text-foreground">{callout.title}</h3>
									<p className="mt-1 text-sm leading-relaxed text-copy">{callout.description}</p>
								</div>
							</li>
						)
					})}
				</ul>
			</div>
		</section>
	)
}
