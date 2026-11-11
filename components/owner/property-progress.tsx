import { PROPERTY_STEPS, propertyStage } from "@/lib/owner/dashboard"
import { cn } from "@/lib/utils"

// Where a property is: Registered → Sent → Being checked → Verified, the same on every card and page, so "how far
// along is it" is a glance, not a sentence. The bar fills in as it appears. Screen readers get the step in words.
export function PropertyProgress({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
    const { step, state } = propertyStage(status)

    return (
        <ol className="grid grid-cols-4 gap-1.5" aria-label="Progress">
            {PROPERTY_STEPS.map((label, index) => {
                const done = index < step || (index === step && state === "done")
                const current = index === step && state === "current"
                const paused = index === step && state === "paused"
                const reached = done || current || paused
                return (
                    <li key={label} className="grid gap-2">
                        <span className={cn("overflow-hidden rounded-full bg-muted ring-1 ring-border/60 ring-inset", size === "md" ? "h-2" : "h-1.5")}>
                            {reached ? (
                                <span
                                    className={cn(
                                        "animate-grow-x block h-full origin-left rounded-full motion-reduce:animate-none",
                                        done && "bg-success",
                                        current && (status === "action_required" ? "bg-secondary" : "bg-primary"),
                                        paused && "bg-warning"
                                    )}
                                    style={{ animationDelay: `${index * 90}ms` }}
                                />
                            ) : null}
                        </span>
                        <span className={cn("text-[0.7rem] leading-tight sm:text-xs", reached ? "font-medium text-foreground" : "text-muted-foreground")}>
                            {paused ? "Paused" : label}
                            <span className="sr-only">{done ? ", done" : current ? ", happening now" : paused ? ", paused" : ", to come"}</span>
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}
