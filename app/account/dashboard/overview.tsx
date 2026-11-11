import type { OwnPropertySummary } from "@/lib/supabase/owner-properties"

// The top of the dashboard: who it's for, how many things need them, and where their properties stand, on the ink
// block with the survey grid that the homepage's technology section uses, so the owner area feels like the same product.
export function Overview({ firstName, todoCount, properties }: { firstName: string | null; todoCount: number; properties: OwnPropertySummary[] }) {
    const checking = properties.filter((property) => ["submitted", "under_review", "action_required"].includes(property.status)).length
    const verified = properties.filter((property) => property.status === "active").length

    return (
        <section
            aria-labelledby="overview-title"
            className="animate-rise block-panel relative overflow-hidden bg-ink text-white motion-reduce:animate-none"
        >
            <div aria-hidden className="survey-grid absolute inset-0 [--grid-line:rgba(255,255,255,0.06)]" />

            <div className="relative grid gap-7 p-6 sm:p-9">
                <div className="grid gap-1.5">
                    <h1 id="overview-title" className="text-display">
                        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
                    </h1>
                    <p className="text-white/75">
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
        <div className="rounded-2xl bg-white/[0.06] px-3 py-3 ring-1 ring-white/10 sm:px-5 sm:py-4">
            <dt className="text-xs text-white/70 sm:text-sm">{label}</dt>
            <dd className={highlight ? "mt-1 text-3xl font-bold tracking-tight tabular-nums text-secondary sm:text-4xl" : "mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl"}>
                {value}
            </dd>
        </div>
    )
}
