import { Check, Pause } from "lucide-react"

import { PROPERTY_STEPS, propertyStage } from "@/lib/owner/dashboard"
import { cn } from "@/lib/utils"

// Where a property is: Registered → Sent → Being checked → Verified, the same on every card and page, so "how far
// along is it" is a glance, not a sentence. Screen readers get the step in words.
export function PropertyProgress({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
    const { step, state } = propertyStage(status)

    return (
        <ol className="grid grid-cols-4 gap-1" aria-label="Progress">
            {PROPERTY_STEPS.map((label, index) => {
                const done = index < step || (index === step && state === "done")
                const current = index === step && state === "current"
                const paused = index === step && state === "paused"
                return (
                    <li key={label} className="grid gap-1.5">
                        <span
                            className={cn(
                                "flex items-center justify-center rounded-full",
                                size === "md" ? "h-2" : "h-1.5",
                                done && "bg-success",
                                current && "bg-primary",
                                paused && "bg-warning",
                                !done && !current && !paused && "bg-muted"
                            )}
                        />
                        <span
                            className={cn(
                                "flex items-center gap-1 text-[0.7rem] leading-tight sm:text-xs",
                                done || current || paused ? "font-medium text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {done ? <Check size={12} strokeWidth={3} className="hidden shrink-0 text-success sm:block" aria-hidden /> : null}
                            {paused ? <Pause size={12} className="hidden shrink-0 text-warning sm:block" aria-hidden /> : null}
                            {paused ? "Paused" : label}
                            <span className="sr-only">{done ? ", done" : current ? ", happening now" : paused ? ", paused" : ", to come"}</span>
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}
