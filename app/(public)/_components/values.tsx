import { Info } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"

// Deep blue with a faint plan grid: the brand's main surface colour, used for the page's firmest statements
export default function Values({ content }: { content: HomeContent["values"] }) {
  const { eyebrow, heading, description } = content.header

  return (
    <section
      className="survey-grid w-full bg-primary py-20 text-primary-foreground [--grid-line:rgba(255,255,255,0.05)] md:py-28"
      id="our-values"
    >
      <div className="mx-auto grid max-w-310 grid-cols-1 gap-12 px-5 md:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="max-w-2xl lg:col-span-5">
          <p className="text-eyebrow text-secondary">{eyebrow}</p>
          <h2 className="text-title mt-3">{heading}</h2>
          <p className="text-lead mt-4 text-white/75">{description}</p>
        </div>

        <div className="lg:col-span-7">
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {content.items.map((value, index) => (
              <div key={value.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 py-7 sm:grid-cols-[3.5rem_1fr]">
                <span className="text-data pt-1 text-sm text-white/50" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <dt className="text-heading">{value.title}</dt>
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
    </section>
  )
}
