import { Fingerprint, History, KeyRound, Layers, Lock, Ruler } from "lucide-react"

import { cn } from "@/lib/utils"
import { Eyebrow } from "./section-heading"

// How OurProps keeps land records safe, in everyday words for any Ghanaian visitor, not engineers. Every claim is
// something the product does today: the overlap check (check_property_boundary_overlaps), saved corners (property
// boundaries), the identity fingerprint and photo deletion (identity documents), the audit log, and documents only the
// owner and reviewers can open (storage policies; the public record never includes them). In code, not Sanity, because each line is a promise that must change with the code.
export default function Technology({ as: Heading = "h2" }: { as?: "h1" | "h2" }) {
	return (
		<section className="w-full py-6 md:py-10" id="technology" aria-labelledby="technology-title">
			<div className="mx-auto max-w-310 px-3 sm:px-5 md:px-8">
				<div className="block-panel survey-grid bg-ink px-5 py-16 text-white [--grid-line:rgba(255,255,255,0.045)] sm:px-8 md:px-12 md:py-24">
					<div className="max-w-3xl">
						<Eyebrow className="bg-white/10 text-white">How we keep it safe</Eyebrow>
						<Heading id="technology-title" className={cn(Heading === "h1" ? "text-hero" : "text-section", "mt-4")}>
							Built to protect your land.
						</Heading>
						<p className="text-lead mt-5 text-white/70">
							Behind every record is careful work: we check the map, keep your documents private and write down every decision.
							That&apos;s why a verified record means something.
						</p>
					</div>

					<ul className="mt-12 grid grid-cols-1 gap-4 md:mt-16 md:grid-cols-6">
						<Tile
							className="md:col-span-4"
							icon={Layers}
							title="We spot land sold twice"
							text="When you mark your land on the map, we compare it with every other property registered with us. If two plots overlap, our team is alerted straight away and looks into it."
						>
							<OverlapVisual />
						</Tile>
						<Tile
							className="md:col-span-2"
							icon={Ruler}
							title="Your land, exactly on the map"
							text="We save every corner of your plot precisely, so the boundary can't quietly move. Our team compares it with your site plan."
						>
							<CornersVisual />
						</Tile>
						<Tile
							className="md:col-span-2"
							icon={Fingerprint}
							title="Your Ghana Card, used only by you"
							text="We check your card once. Then we keep only a scrambled code of the number, so nobody else can register with your card, and we delete the photo."
						>
							<CardVisual />
						</Tile>
						<Tile
							className="md:col-span-2"
							icon={History}
							title="Every decision written down"
							text="Each step our team takes is recorded, with who did it and why. Nothing happens quietly."
						>
							<HistoryVisual />
						</Tile>
						<Tile
							className="md:col-span-2"
							icon={KeyRound}
							title="Your documents stay private"
							text="Only you and our review team can open your documents. They never appear on your public record."
						>
							<PrivateVisual />
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

// Two neighbouring plots on a map, the part where they overlap pulsing
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
				{/* the overlap: the other plot, clipped to yours */}
				<path
					d="M195 45 L360 35 L370 155 L210 160 Z"
					clipPath="url(#tech-plot-a)"
					className="animate-overlap"
					fill="#FF6B35"
					stroke="#FF6B35"
					strokeWidth="2"
				/>
				<text x="78" y="52" className="fill-white/85 text-[13px] font-medium">Your plot</text>
				<text x="276" y="58" className="fill-white/85 text-[13px] font-medium">Another plot</text>
			</svg>
			<span className="absolute top-[42%] left-[47%] flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-ink shadow-lg">
				Overlap found
			</span>
		</div>
	)
}

// A plot with its four corners pinned and numbered: precise, without coordinates nobody needs to read
function CornersVisual() {
	const corners = [
		[40, 30],
		[170, 22],
		[182, 118],
		[52, 128],
	]
	return (
		<div className="grid w-full gap-2">
			<svg viewBox="0 0 220 150" className="h-auto w-full max-w-60 justify-self-center">
				<path d={`M${corners.map(([x, y]) => `${x} ${y}`).join(" L")} Z`} fill="rgba(255,107,53,0.14)" stroke="#FF6B35" strokeWidth="2" />
				{corners.map(([x, y], index) => (
					<g key={index}>
						<circle cx={x} cy={y} r="9" fill="#FF6B35" stroke="#0B1E33" strokeWidth="2" />
						<text x={x} y={y} dy="0.35em" textAnchor="middle" className="fill-[#0B1E33] text-[10px] font-bold">
							{index + 1}
						</text>
					</g>
				))}
			</svg>
			<span className="text-center text-xs text-white/60">Every corner saved exactly</span>
		</div>
	)
}

// The card number becomes a code only OurProps can match, and the photo goes
function CardVisual() {
	return (
		<div className="grid w-full gap-2 text-xs">
			<span className="text-data rounded-lg bg-white/5 px-3 py-2 text-white/75">GHA-7•••••••••-3</span>
			<span className="text-center text-secondary">↓ scrambled</span>
			<span className="flex items-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-white">
				<Lock size={13} className="shrink-0 text-secondary" /> A code only we can match
			</span>
			<span className="flex items-center gap-1.5 text-white/60">
				<span className="size-1.5 rounded-full bg-[#6FCF97]" /> Photo deleted after checking
			</span>
		</div>
	)
}

function HistoryVisual() {
	const lines = [
		["10:42", "Documents checked"],
		["10:47", "Boundary checked"],
		["11:03", "Property verified"],
	]
	return (
		<div className="grid w-full gap-1.5 text-xs">
			{lines.map(([time, action]) => (
				<div key={time} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
					<span className="text-data text-white/45">{time}</span>
					<span className="text-white/85">{action}</span>
					<span className="ml-auto text-white/45">reason noted</span>
				</div>
			))}
		</div>
	)
}

// A document only two people can open: you and our review team; everyone else sees a lock
function PrivateVisual() {
	return (
		<div className="grid w-full gap-2 text-xs">
			<div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-white/85">
				<Lock size={13} className="shrink-0 text-secondary" /> Indenture
			</div>
			<div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
				<span className="text-white/85">You</span>
				<span className="text-[#6FCF97]">Can open</span>
			</div>
			<div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
				<span className="text-white/85">Our review team</span>
				<span className="text-[#6FCF97]">Can open</span>
			</div>
			<div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
				<span className="text-white/85">Everyone else</span>
				<span className="text-white/50">Private</span>
			</div>
		</div>
	)
}
