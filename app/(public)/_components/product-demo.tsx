"use client"

import { BadgeCheck, Check, Image as ImageIcon, Map as MapIcon, MessageCircle, Pause, Play, ScrollText } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

import { PUBLIC_CHECKS } from "@/lib/public-record"
import { cn } from "@/lib/utils"

import { BoundaryMap, PlanFrame, SAMPLE_PROPERTY } from "./property-record"

// What OurProps does, shown rather than described: an owner registers a plot and it ends up verified and shared, in
// five short scenes that play on their own. Built from real product pieces, not a video, so it's light on mobile data and
// always matches the product. Only what OurProps actually does today is shown.

const SCENES = [
	{ key: "map", title: "Mark it on the map", text: "Drop a pin where the land is, and trace its boundary if you can." },
	{ key: "documents", title: "Add your documents", text: "Photos or scans of your indenture, site plan and anything else you have." },
	{ key: "checks", title: "We check it", text: "Our team checks the owner, the documents, the boundary and any overlapping claims." },
	{ key: "verified", title: "Verified", text: "The property gets a public record showing exactly what was checked." },
	{ key: "share", title: "Share it", text: "Send the record to a buyer, tenant or family on WhatsApp. Your documents stay private." },
] as const

const SCENE_MS = 4200
const REFERENCE = "PROP-x7Kd2q"

const DOCUMENTS = [
	{ icon: ScrollText, name: "Indenture.pdf", detail: "Ownership document" },
	{ icon: MapIcon, name: "Site plan.jpg", detail: "Site plan" },
	{ icon: ImageIcon, name: "Receipt.jpg", detail: "Supporting document" },
]


export default function ProductDemo() {
	const [scene, setScene] = useState(0)
	// what the visitor chose with the play button, if anything; until then it plays unless they asked for less motion
	const [chosen, setChosen] = useState<boolean | null>(null)
	// paused while the visitor hovers or focuses inside, so a scene doesn't change under them
	const [held, setHeld] = useState(false)
	const root = useRef<HTMLDivElement>(null)

	// No playing on its own for people who ask for less motion; the tabs still show every scene, and Play still works
	const reduceMotion = usePrefersReducedMotion()
	const playing = chosen ?? !reduceMotion

	const advance = useCallback(() => setScene((current) => (current + 1) % SCENES.length), [])

	useEffect(() => {
		if (!playing || held) return
		const timer = window.setTimeout(advance, SCENE_MS)
		return () => window.clearTimeout(timer)
	}, [playing, held, scene, advance])

	// Not while the tab is hidden: the visitor comes back to where they left it
	useEffect(() => {
		const onVisibility = () => setHeld(document.hidden)
		document.addEventListener("visibilitychange", onVisibility)
		return () => document.removeEventListener("visibilitychange", onVisibility)
	}, [])

	const running = playing && !held

	return (
		<div
			ref={root}
			className="grid gap-6"
			onMouseEnter={() => setHeld(true)}
			onMouseLeave={() => setHeld(false)}
			onFocus={() => setHeld(true)}
			onBlur={(event) => {
				if (!root.current?.contains(event.relatedTarget as Node)) setHeld(false)
			}}
		>
			{/* the steps, each with a bar that fills while its scene plays, like stories on a phone */}
			<div className="flex items-center gap-3">
				<div role="tablist" aria-label="How OurProps works" className="grid flex-1 grid-cols-5 gap-1.5 sm:gap-3">
					{SCENES.map((each, index) => (
						<button
							key={each.key}
							type="button"
							role="tab"
							id={`demo-tab-${each.key}`}
							aria-selected={index === scene}
							aria-controls="demo-scene"
							onClick={() => setScene(index)}
							className="group grid gap-2 text-left outline-none"
						>
							<span className="h-1 overflow-hidden rounded-full bg-primary/10 group-focus-visible:ring-2 group-focus-visible:ring-ring/50">
								<span
									key={`${scene}-${running}`}
									className={cn(
										"block h-full origin-left rounded-full bg-secondary",
										index < scene && "scale-x-100",
										index > scene && "scale-x-0",
										index === scene && (running ? "animate-[grow-x_linear_both]" : "scale-x-100")
									)}
									style={index === scene && running ? { animationDuration: `${SCENE_MS}ms` } : undefined}
								/>
							</span>
							<span
								className={cn(
									"hidden text-xs font-medium transition-colors sm:block",
									index === scene ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
								)}
							>
								{each.title}
							</span>
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={() => setChosen(!playing)}
					aria-label={playing ? "Pause the walkthrough" : "Play the walkthrough"}
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border transition-colors outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					{playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
				</button>
			</div>

			<PlanFrame className="bg-background">
				<div
					id="demo-scene"
					role="tabpanel"
					aria-labelledby={`demo-tab-${SCENES[scene].key}`}
					// announced only when the visitor is in control, so an auto-playing demo doesn't talk over them
					aria-live={running ? "off" : "polite"}
					className="grid min-h-[22rem] items-center gap-6 p-5 sm:min-h-[24rem] sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
				>
					<div className="grid gap-2">
						<p className="text-data text-xs text-muted-foreground">
							Step {scene + 1} of {SCENES.length}
						</p>
						<h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{SCENES[scene].title}</h3>
						<p className="text-copy">{SCENES[scene].text}</p>
					</div>
					{/* keyed by scene, so each one plays its animation from the start when it appears */}
					<div key={SCENES[scene].key} className="animate-fade-up motion-reduce:animate-none">
						<Scene name={SCENES[scene].key} />
					</div>
				</div>
			</PlanFrame>
		</div>
	)
}

function Scene({ name }: { name: (typeof SCENES)[number]["key"] }) {
	switch (name) {
		case "map":
			return (
				<div aria-hidden className="relative">
					<BoundaryMap className="h-56 w-full sm:h-64" coordinates={SAMPLE_PROPERTY.coordinates} />
					<span className="animate-pin-drop absolute top-[38%] left-1/2 -translate-x-1/2 motion-reduce:animate-none" style={{ animationDelay: "350ms" }}>
						<svg viewBox="0 0 34 44" className="h-11 w-auto drop-shadow-md">
							<path d="M17 1C8.2 1 1 7.9 1 16.6 1 28.4 17 43 17 43s16-14.6 16-26.4C33 7.9 25.8 1 17 1z" className="fill-secondary" />
							<circle cx="17" cy="16.5" r="6" className="fill-card" />
						</svg>
					</span>
				</div>
			)

		case "documents":
			return (
				<ul aria-hidden className="grid gap-2.5">
					{DOCUMENTS.map(({ icon: Icon, name, detail }, index) => (
						<li
							key={name}
							className="animate-fade-up flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 motion-reduce:animate-none"
							style={{ animationDelay: `${index * 250}ms` }}
						>
							<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
								<Icon size={18} />
							</span>
							<span className="grid min-w-0 flex-1 gap-1.5">
								<span className="flex items-center justify-between gap-2 text-sm">
									<span className="truncate font-medium text-foreground">{name}</span>
									<span
										className="animate-pop-in flex items-center gap-1 text-xs font-medium text-success motion-reduce:animate-none"
										style={{ animationDelay: `${900 + index * 350}ms` }}
									>
										<Check size={13} strokeWidth={3} /> Uploaded
									</span>
								</span>
								<span className="h-1 overflow-hidden rounded-full bg-muted">
									<span
										className="animate-grow-x block h-full origin-left rounded-full bg-success motion-reduce:animate-none"
										style={{ animationDelay: `${200 + index * 350}ms`, animationDuration: "900ms" }}
									/>
								</span>
								<span className="text-xs text-muted-foreground">{detail}</span>
							</span>
						</li>
					))}
				</ul>
			)

		case "checks":
			return (
				<ul aria-hidden className="grid gap-1 rounded-xl border border-border bg-card p-2">
					{/* the same checks, in the same words, as a real public record */}
					{PUBLIC_CHECKS.map(({ title: check }, index) => (
						<li key={check} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
							<span className="relative flex size-6 shrink-0 items-center justify-center">
								<span className="absolute inset-0 rounded-full border-2 border-dashed border-border" />
								<span
									className="animate-pop-in absolute inset-0 flex items-center justify-center rounded-full bg-success text-white motion-reduce:animate-none"
									style={{ animationDelay: `${250 + index * 440}ms` }}
								>
									<Check size={13} strokeWidth={3} />
								</span>
							</span>
							<span className="font-medium text-foreground">{check}</span>
						</li>
					))}
				</ul>
			)

		case "verified":
			return (
				<div aria-hidden className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
					<span
						className="animate-pop-in inline-flex w-fit items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success motion-reduce:animate-none"
						style={{ animationDelay: "250ms" }}
					>
						<BadgeCheck size={16} /> Verified by OurProps
					</span>
					<div className="grid gap-1">
						<p className="text-lg font-semibold tracking-tight text-foreground">{SAMPLE_PROPERTY.name}</p>
						<p className="text-sm text-copy">Land in {SAMPLE_PROPERTY.location} · 1,240 m²</p>
					</div>
					<div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
						<span>
							<span className="text-muted-foreground">Reference </span>
							<span className="text-data font-medium text-foreground">{REFERENCE}</span>
						</span>
						<span className="text-success">{PUBLIC_CHECKS.length} checks done</span>
					</div>
				</div>
			)

		case "share":
			return (
				<div aria-hidden className="mx-auto grid w-full max-w-sm gap-2 rounded-2xl bg-[#E7DED4] p-4 shadow-sm">
					<p className="flex items-center gap-1.5 text-xs font-medium text-[#3B4A54]">
						<MessageCircle size={14} /> WhatsApp
					</p>
					<div className="animate-fade-up ml-auto grid max-w-[85%] gap-2 rounded-xl rounded-tr-sm bg-[#D9FDD3] p-2.5 shadow-xs motion-reduce:animate-none">
						<div className="grid gap-1 rounded-lg bg-white/80 p-2.5">
							<span className="flex items-center gap-1 text-xs font-semibold text-success">
								<BadgeCheck size={13} /> Verified on OurProps
							</span>
							<span className="text-sm font-medium text-[#111B21]">{SAMPLE_PROPERTY.name}</span>
							<span className="text-data truncate text-[11px] text-[#667781]">…/record/{REFERENCE}</span>
						</div>
						<span className="text-sm text-[#111B21]">Here&apos;s the verified record for the plot 👍</span>
						<span className="ml-auto flex items-center gap-1 text-[10px] text-[#667781]">
							14:02 <span className="text-[#53BDEB]">✓✓</span>
						</span>
					</div>
				</div>
			)
	}
}

// Whether the visitor asked their device for less motion, following it if they change it. False on the server.
function usePrefersReducedMotion() {
	return useSyncExternalStore(
		(onChange) => {
			const query = window.matchMedia("(prefers-reduced-motion: reduce)")
			query.addEventListener("change", onChange)
			return () => query.removeEventListener("change", onChange)
		},
		() => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		() => false
	)
}
