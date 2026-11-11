import { Fingerprint, History, KeyRound, Layers, Lock, Ruler } from "lucide-react"

import { cn } from "@/lib/utils"
import { Eyebrow } from "./section-heading"

// What's under the hood, for visitors who want to know why they can trust a record, and to show there's real
// engineering behind it. Every claim here is something the product does today (see the source each note names); the
// document converter isn't listed while it isn't deployed. In code, not Sanity, because each line is a technical
// promise that must change with the code.
export default function Technology({ as: Heading = "h2" }: { as?: "h1" | "h2" }) {
	return (
		<section className="w-full py-6 md:py-10" id="technology" aria-labelledby="technology-title">
			<div className="mx-auto max-w-310 px-3 sm:px-5 md:px-8">
				<div className="block-panel survey-grid bg-ink px-5 py-16 text-white [--grid-line:rgba(255,255,255,0.045)] sm:px-8 md:px-12 md:py-24">
					<div className="max-w-3xl">
						<Eyebrow className="bg-white/10 text-white">Under the hood</Eyebrow>
						<Heading id="technology-title" className={cn(Heading === "h1" ? "text-hero" : "text-section", "mt-4")}>
							Serious technology behind every record.
						</Heading>
						<p className="text-lead mt-5 text-white/70">
							Precise mapping, automatic geometry checks and security built into the database itself, so a verified record means something.
						</p>
					</div>

					<ul className="mt-12 grid grid-cols-1 gap-4 md:mt-16 md:grid-cols-6">
						<Tile
							className="md:col-span-4"
							icon={Layers}
							title="Overlaps found automatically"
							text="The moment a boundary is saved, it's measured against every other property on our map. Any overlap bigger than 5 m² is flagged to our team with its exact size."
						>
							<OverlapVisual />
						</Tile>
						<Tile
							className="md:col-span-2"
							icon={Ruler}
							title="Boundaries to the millimetre"
							text="Coordinates are kept to nine decimal places. Bring your surveyor's GeoJSON file and the boundary goes straight onto the map."
						>
							<CoordinatesVisual />
						</Tile>
						<Tile
							className="md:col-span-2"
							icon={Fingerprint}
							title="One identity, used once"
							text="Your Ghana Card number becomes a keyed fingerprint, so the same card can't be used twice. Once you're verified, we delete the photo and the number."
						>
							<FingerprintVisual />
						</Tile>
						<Tile
							className="md:col-span-2"
							icon={History}
							title="Every decision on record"
							text="Each step our team takes is logged with who made it and why, so a verification can always be traced."
						>
							<AuditVisual />
						</Tile>
						<Tile
							className="md:col-span-2"
							icon={KeyRound}
							title="Locked at the database"
							text="Your documents are sealed to you and our review team by the database itself, and reviewers must sign in with a second factor."
						>
							<LockVisual />
						</Tile>
					</ul>
				</div>
			</div>
		</section>
	)
}

function Tile({
	icon: Icon,
	title,
	text,
	className,
	children,
}: {
	icon: typeof Layers
	title: string
	text: string
	className?: string
	children: React.ReactNode
}) {
	return (
		<li className={cn("flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm", className)}>
			<div className="flex min-h-44 items-center justify-center border-b border-white/10 p-5" aria-hidden>
				{children}
			</div>
			<div className="grid gap-2 p-5 md:p-6">
				<h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
					<Icon size={18} className="text-secondary" aria-hidden />
					{title}
				</h3>
				<p className="text-sm leading-relaxed text-white/70">{text}</p>
			</div>
		</li>
	)
}

// Two neighbouring plots on a map, the area where they overlap pulsing, and the flag the check raises
function OverlapVisual() {
	return (
		<div className="relative w-full max-w-xl">
			<svg viewBox="0 0 420 170" className="h-auto w-full">
				<defs>
					<clipPath id="tech-plot-a">
						<path d="M60 30 L230 20 L250 140 L70 150 Z" />
					</clipPath>
				</defs>
				<g stroke="rgba(255,255,255,0.08)">
					{Array.from({ length: 9 }, (_, i) => (
						<line key={`v${i}`} x1={i * 52} x2={i * 52} y1={0} y2={170} />
					))}
					{Array.from({ length: 4 }, (_, i) => (
						<line key={`h${i}`} x1={0} x2={420} y1={i * 52} y2={i * 52} />
					))}
				</g>
				<path d="M60 30 L230 20 L250 140 L70 150 Z" fill="rgba(42,120,214,0.22)" stroke="#5B9BEA" strokeWidth="2" />
				<path d="M195 45 L360 35 L370 155 L210 160 Z" fill="rgba(46,125,91,0.22)" stroke="#6FCF97" strokeWidth="2" />
				{/* the overlap: plot B, clipped to plot A */}
				<path
					d="M195 45 L360 35 L370 155 L210 160 Z"
					clipPath="url(#tech-plot-a)"
					className="animate-overlap"
					fill="#FF6B35"
					stroke="#FF6B35"
					strokeWidth="2"
				/>
				<text x="78" y="52" className="fill-white/80 font-mono text-[11px]">PROP-x7Kd2q</text>
				<text x="290" y="58" className="fill-white/80 font-mono text-[11px]">PROP-k91Lm0</text>
			</svg>
			<span className="absolute top-[42%] left-[47%] flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-ink shadow-lg">
				Overlap · 1,284 m² · 11%
			</span>
		</div>
	)
}

function CoordinatesVisual() {
	const rows = [
		["5.603718214", "-0.187012946"],
		["5.603902377", "-0.186771508"],
		["5.603655091", "-0.186598230"],
	]
	return (
		<div className="text-data grid w-full gap-1.5 text-[11px] text-white/75 sm:text-xs">
			{rows.map(([lat, lng], index) => (
				<div key={lat} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
					<span className="text-white/40">{index + 1}</span>
					<span>{lat}</span>
					<span>{lng}</span>
				</div>
			))}
			<span className="mt-1 self-end text-right text-secondary">± 0.000000001°</span>
		</div>
	)
}

function FingerprintVisual() {
	return (
		<div className="text-data grid w-full gap-2 text-xs">
			<span className="rounded-lg bg-white/5 px-3 py-2 text-white/75">GHA-7•••••••••-3</span>
			<span className="text-center text-secondary">↓ keyed fingerprint</span>
			<span className="truncate rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-white">
				9f2c·41ab·e07d·c3…
			</span>
			<span className="flex items-center gap-1.5 text-white/50">
				<span className="size-1.5 rounded-full bg-[#6FCF97]" /> Photo deleted after verification
			</span>
		</div>
	)
}

function AuditVisual() {
	const lines = [
		["10:42", "Documents checked"],
		["10:47", "Boundary checked"],
		["11:03", "Property verified"],
	]
	return (
		<div className="text-data grid w-full gap-1.5 text-[11px] sm:text-xs">
			{lines.map(([time, action]) => (
				<div key={time} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
					<span className="text-white/40">{time}</span>
					<span className="text-white/85">{action}</span>
					<span className="ml-auto text-white/40">reason ✓</span>
				</div>
			))}
			<span className="px-3 text-secondary">
				_<span className="animate-blink">▍</span>
			</span>
		</div>
	)
}

function LockVisual() {
	return (
		<div className="grid w-full gap-3">
			<div className="flex items-center justify-center gap-1.5">
				{["4", "8", "1", "9", "0", "6"].map((digit, index) => (
					<span
						key={index}
						className="text-data flex size-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-sm text-white"
					>
						{digit}
					</span>
				))}
			</div>
			<div className="flex items-center justify-center gap-2 text-xs text-white/60">
				<Lock size={13} className="text-secondary" /> Indenture.pdf · you + review team only
			</div>
		</div>
	)
}
