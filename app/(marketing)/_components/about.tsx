export default function About() {
  return (
    <section className="w-full py-14 sm:py-20 md:py-24" id="about">
      <div className="max-w-310 mx-auto px-4 md:px-8">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            About OurProps
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground text-balance">
            Revolutionizing land and property management in Ghana and West
            Africa.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            We built OurProps to solve real issues in our communities:
            fraudulent sales, overlapping claims, endless disputes, and low
            transparency in real estate transactions.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground">
              Our Mission
            </h3>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              To revolutionize land and property management in Ghana and West
              Africa through innovative technology, ensuring transparency,
              efficiency, and trust in real estate transactions.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-xl sm:text-2xl font-semibold text-foreground">
              Our Vision
            </h3>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              To become the go-to platform for real estate management and
              conflict-free property transactions across Africa.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
