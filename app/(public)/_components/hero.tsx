import { ArrowRight, Lock } from "lucide-react"
import Link from "next/link"

import type { HomeContent } from "@/lib/content/defaults"
import { PUBLIC_CHECKS } from "@/lib/public-record"
import { getIcon } from "./icons"
import ProductDemo from "./product-demo"

function GhanaFlag() {
    return (
        <svg className="h-3 w-4 shrink-0 overflow-hidden rounded-[2px] shadow-xs" viewBox="0 0 640 480" aria-hidden>
            <path d="M0 0h640v160H0z" fill="#CE1126" />
            <path d="M0 160h640v160H0z" fill="#FCD116" />
            <path d="M0 320h640v160H0z" fill="#006B3F" />
            <polygon
                fill="#000000"
                points="320,165 344,238 421,238 359,283 382,356 320,311 258,356 281,283 219,238 296,238"
            />
        </svg>
    )
}

// The opening, the way Figma opens: a very large headline, two buttons, then the product itself on stage, playing,
// with two "people" at work on it. Then the seven things we check, scrolling past, so the promise is concrete at once.
export default function Hero({ content }: { content: HomeContent["hero"] }) {
    return (
        <section className="relative overflow-hidden">
            <div className="mx-auto flex max-w-310 flex-col items-center px-5 pt-14 text-center md:px-8 md:pt-24">
                <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground shadow-xs">
                    <GhanaFlag />
                    {content.launchNote}
                    {/* on a phone the pill keeps to one line */}
                    <span className="hidden h-3.5 w-px bg-border sm:block" aria-hidden />
                    <span className="hidden text-copy sm:inline">{content.eyebrow}</span>
                </p>

                <h1 className="text-hero animate-rise mt-7 max-w-5xl text-ink" style={{ animationDelay: "60ms" }}>
                    {content.heading}
                </h1>

                <p className="text-lead animate-rise mt-6 max-w-2xl text-copy" style={{ animationDelay: "120ms" }}>
                    {content.subheading}
                </p>

                <div className="animate-rise mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={{ animationDelay: "180ms" }}>
                    <Link
                        href={content.primaryCta.href}
                        className="pressable inline-flex h-13 items-center justify-center gap-2 rounded-full bg-ink px-7 text-base font-semibold text-white hover:bg-ink/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                        {content.primaryCta.label}
                        <ArrowRight size={17} aria-hidden />
                    </Link>
                    <Link
                        href={content.secondaryCta.href}
                        className="pressable inline-flex h-13 items-center justify-center rounded-full border border-ink/15 bg-card px-7 text-base font-semibold text-ink hover:border-ink/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                        {content.secondaryCta.label}
                    </Link>
                </div>

                <ul className="animate-rise mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-copy" style={{ animationDelay: "240ms" }}>
                    {content.trustPoints.map((point) => {
                        const Icon = getIcon(point.icon)
                        return (
                            <li key={point.text} className="flex items-center gap-1.5">
                                <Icon size={15} className="text-success" aria-hidden />
                                {point.text}
                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className="mt-14 md:mt-20" id="product">
                <DemoStage />
            </div>

            <ChecksMarquee />
        </section>
    )
}

// The walkthrough in a browser window, on an orange block with the site-plan grid, with two "people" at work on it.
// Used here and on /how-it-works.
export function DemoStage() {
    return (
        <div className="mx-auto max-w-310 px-3 sm:px-5 md:px-8">
            <div className="block-panel survey-grid relative bg-block-orange p-3 [--grid-line:rgba(255,107,53,0.12)] sm:p-6 md:p-10">
                <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-card shadow-[0_30px_80px_-30px_rgba(11,30,51,0.45)]">
                    <BrowserBar />
                    <div className="p-4 sm:p-6 md:p-8">
                        <ProductDemo />
                    </div>
                </div>

                {/* people at work on the record: decorative, the walkthrough says what happens */}
                <Cursor label="You" colour="#FF6B35" className="animate-cursor-a top-[22%] right-[12%] hidden sm:flex" />
                <Cursor label="OurProps review team" colour="#2A78D6" className="animate-cursor-b bottom-[18%] left-[8%] hidden md:flex" />
            </div>
        </div>
    )
}

// The top of a browser window, with the record's address, so it reads as the real product
function BrowserBar() {
    return (
        <div className="flex items-center gap-3 border-b border-border bg-background/70 px-4 py-2.5" aria-hidden>
            <span className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="size-2.5 rounded-full bg-[#28C840]" />
            </span>
            <span className="text-data mx-auto flex min-w-0 items-center gap-1.5 truncate rounded-md bg-card px-3 py-1 text-xs text-copy ring-1 ring-border">
                <Lock size={11} className="shrink-0 text-success" />
                ourprops.com/record/PROP-x7Kd2q
            </span>
            <span className="w-12" />
        </div>
    )
}

function Cursor({ label, colour, className }: { label: string; colour: string; className?: string }) {
    return (
        <span aria-hidden className={`pointer-events-none absolute z-10 flex-col items-start ${className ?? ""}`}>
            <svg width="22" height="22" viewBox="0 0 22 22" className="drop-shadow-sm">
                <path d="M3 2l15 7.5-6.5 1.8L8.6 18z" fill={colour} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span
                className="-mt-1 ml-4 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-md"
                style={{ backgroundColor: colour }}
            >
                {label}
            </span>
        </span>
    )
}

// Every check a verified record shows, scrolling past. Doubled so it loops seamlessly; the copy is hidden from
// screen readers, which get the list once.
function ChecksMarquee() {
    const chips = PUBLIC_CHECKS.map((check) => check.title)

    return (
        <div className="mt-12 md:mt-16">
            <p className="text-eyebrow text-center text-muted-foreground">Every verified property is checked for</p>
            <div className="relative mt-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
                <div className="animate-marquee flex w-max gap-3 pr-3 hover:[animation-play-state:paused]">
                    {[0, 1].map((copy) => (
                        <ul key={copy} className="flex gap-3" aria-hidden={copy === 1 ? true : undefined}>
                            {chips.map((chip) => (
                                <li
                                    key={chip}
                                    className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground shadow-xs"
                                >
                                    <span className="flex size-5 items-center justify-center rounded-full bg-success text-[11px] font-bold text-white">✓</span>
                                    {chip}
                                </li>
                            ))}
                        </ul>
                    ))}
                </div>
            </div>
        </div>
    )
}
