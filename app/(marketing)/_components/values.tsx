import { LockKeyhole, ShieldCheck, Waypoints } from "lucide-react"

const VALUES = [
  {
    title: "Transparency",
    description:
      "Clear property records, verified documentation, and up-to-date information that reduce guesswork and build trust.",
    icon: Waypoints,
  },
  {
    title: "Security",
    description:
      "Advanced protection for property data and transactions, so owners, seekers, and agents can act with confidence.",
    icon: LockKeyhole,
  },
  {
    title: "Reliability",
    description:
      "Consistent, dependable workflows for managing listings, ownership details, and critical property documentation.",
    icon: ShieldCheck,
  },
]

export default function Values() {
  return (
    <section className="w-full bg-card py-14 sm:py-20 md:py-24" id="our-values">
      <div className="max-w-310 mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Our Values
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground text-balance">
            Built on transparency, security, and reliability.
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            These values guide every feature we build for property owners,
            seekers, and agents.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
          {VALUES.map((value) => {
            const Icon = value.icon

            return (
              <article
                key={value.title}
                className="bg-background rounded-xl border border-border p-5 sm:p-6 md:p-8"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                  {value.description}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
