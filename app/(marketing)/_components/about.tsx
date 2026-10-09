import type { HomeContent } from "@/lib/content/defaults"
import SectionHeading from "./section-heading"

export default function About({ content }: { content: HomeContent["about"] }) {
  const statements = [
    { label: "Our mission", text: content.mission },
    { label: "Our vision", text: content.vision },
  ]

  return (
    <section className="w-full py-20 md:py-28" id="about">
      <div className="mx-auto grid max-w-310 grid-cols-1 gap-12 px-5 md:px-8 lg:grid-cols-12 lg:gap-16">
        <SectionHeading className="lg:col-span-6" {...content.header} />

        <dl className="divide-y divide-border border-y border-border lg:col-span-6 lg:self-end">
          {statements.map((statement) => (
            <div key={statement.label} className="py-6">
              <dt className="text-eyebrow text-muted-foreground">{statement.label}</dt>
              <dd className="mt-2 text-lg leading-relaxed text-foreground text-pretty">{statement.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
