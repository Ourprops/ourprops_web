import type { HomeContent } from "@/lib/content/defaults"
import SectionHeading from "./section-heading"

// Opens the /about page, so its heading is the page's h1
export default function About({ content }: { content: HomeContent["about"] }) {
  const statements = [
    { label: "Our mission", text: content.mission },
    { label: "Our vision", text: content.vision },
  ]

  return (
    <section className="w-full py-24 md:py-32" id="about">
      <div className="mx-auto grid max-w-310 grid-cols-1 gap-14 px-5 md:px-8">
        {/* the headline takes the full width; mission and vision sit side by side under it */}
        <SectionHeading as="h1" className="max-w-5xl" {...content.header} />

        <dl className="grid gap-4 md:grid-cols-2">
          {statements.map((statement) => (
            <div key={statement.label} className="block-panel bg-block-sand p-7 md:p-8">
              <dt className="text-eyebrow text-muted-foreground">{statement.label}</dt>
              <dd className="mt-3 text-xl leading-relaxed font-medium tracking-tight text-ink text-pretty md:text-2xl">{statement.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
