import type { OwnPropertySummary } from "@/lib/supabase/owner-properties"

// The top of the dashboard: who it's for, how many things need them, and where their properties stand, on the deep
// blue and survey grid the landing page uses, so the owner area feels like the same product.
export function Overview({ firstName, todoCount, properties }: { firstName: string | null; todoCount: number; properties: OwnPropertySummary[] }) {
    const checking = properties.filter((property) => ["submitted", "under_review", "action_required"].includes(property.status)).length
    const verified = properties.filter((property) => property.status === "active").length

    return (
        <section
            aria-labelledby="overview-title"
            className="animate-rise relative overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-card motion-reduce:animate-none"
        >
            <div aria-hidden className="survey-grid absolute inset-0 [--grid-line:rgba(255,255,255,0.06)]" />
            {/* a warm light in one corner, so the blue isn't flat */}
            <div aria-hidden className="absolute -top-24 -right-16 size-64 rounded-full bg-secondary/25 blur-3xl" />

            <div className="relative grid gap-6 p-5 sm:p-7">
                <div className="grid gap-1.5">
                    <h1 id="overview-title" className="text-display">
                        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
                    </h1>
                    <p className="text-sm text-primary-foreground/75">
                        {todoCount === 0 ? "Everything is in hand." : todoCount === 1 ? "1 thing needs you." : `${todoCount} things need you.`}
                    </p>
                </div>

                {properties.length > 0 ? (
                    <dl className="grid grid-cols-3 gap-2 sm:gap-3">
                        <Stat label="Needs you" value={todoCount} highlight={todoCount > 0} />
                        <Stat label="Being checked" value={checking} />
                        <Stat label="Verified" value={verified} />
                    </dl>
                ) : null}
            </div>
        </section>
    )
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div className="rounded-xl bg-white/8 px-3 py-2.5 ring-1 ring-white/10 sm:px-4 sm:py-3">
            <dt className="text-xs text-primary-foreground/70">{label}</dt>
            <dd className={highlight ? "mt-0.5 text-2xl font-semibold tabular-nums text-secondary" : "mt-0.5 text-2xl font-semibold tabular-nums"}>
                {value}
            </dd>
        </div>
    )
}
