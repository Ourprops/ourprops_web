import { ArrowRight, Info } from "lucide-react"

import Link from "next/link"

import type { HomeContent } from "@/lib/content/defaults"
import { Eyebrow } from "./section-heading"
import { reveal } from "@/lib/reveal"

// Deep blue with a faint plan grid: the brand's main surface colour, used for the page's firmest statements
// On the homepage it links on to /about; on /about it's the second section, so no link
export default function Values({ content, showMore = false }: { content: HomeContent["values"]; showMore?: boolean }) {
  const { eyebrow, heading, description } = content.header

  return (
    <section className="w-full py-6 md:py-10" id="our-values">
      <div className="mx-auto max-w-310 px-3 sm:px-5 md:px-8">
      <div {...reveal()} className="block-panel survey-grid grid grid-cols-1 gap-12 bg-primary px-5 py-16 text-primary-foreground [--grid-line:rgba(255,255,255,0.05)] sm:px-8 md:px-12 md:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="max-w-2xl lg:col-span-5">
          <Eyebrow className="bg-white/10 text-white">{eyebrow}</Eyebrow>
          <h2 className="text-section mt-4">{heading}</h2>
          <p className="text-lead mt-5 text-white/75">{description}</p>
          {showMore ? (
            <Link
              href="/about"
              className="pressable group mt-8 inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-ink hover:bg-white/90"
            >
              About OurProps
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
            </Link>
          ) : null}
        </div>

        <div className="lg:col-span-7">
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {content.items.map((value, index) => (
              <div key={value.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 py-7 sm:grid-cols-[3.5rem_1fr]">
                <span className="text-data pt-1 text-sm text-white/50" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <dt className="text-xl font-bold tracking-tight">{value.title}</dt>
                  <dd className="mt-2 text-base leading-relaxed text-white/75">{value.description}</dd>
                </div>
              </div>
            ))}
          </dl>

          {/* Stated plainly, not hidden in fine print */}
          <p className="mt-8 flex items-start gap-3 rounded-lg border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-white/80">
            <Info size={18} className="mt-0.5 shrink-0 text-secondary" aria-hidden />
            <span>{content.disclaimer}</span>
          </p>
        </div>
      </div>
      </div>
    </section>
  )
}
