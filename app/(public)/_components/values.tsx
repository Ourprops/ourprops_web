import { Info } from "lucide-react"

import type { HomeContent } from "@/lib/content/defaults"
import { getIcon } from "./icons"
import SectionHeading from "./section-heading"

export default function Values({ content }: { content: HomeContent["values"] }) {
  return (
    <section className="w-full bg-card py-20 md:py-28" id="our-values">
      <div className="mx-auto max-w-310 px-5 md:px-8">
        <SectionHeading align="center" {...content.header} />

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {content.items.map((value) => {
            const Icon = getIcon(value.icon)

            return (
              <article key={value.title} className="flex flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/8 text-primary">
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className="text-heading mt-5 text-foreground">{value.title}</h3>
                <p className="mt-3 max-w-xs text-base leading-relaxed text-copy">{value.description}</p>
              </article>
            )
          })}
        </div>

        {/* Stated plainly, not hidden in fine print */}
        <p className="mx-auto mt-16 flex max-w-2xl items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-copy">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <span>{content.disclaimer}</span>
        </p>
      </div>
    </section>
  )
}
