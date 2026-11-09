import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

type Status = "unreviewed" | "verified" | "rejected"

// Where the owner's document stands, as three steps: sent, checked by our team, verified. Shown in every state, so the
// owner always sees what has happened and what comes next.
export function IdentitySteps({ status }: { status: Status }) {
    const steps: { label: string; state: "done" | "current" | "failed" | "todo" }[] = [
        { label: "Sent", state: "done" },
        {
            label: status === "rejected" ? "Not accepted" : "Checked by our team",
            state: status === "unreviewed" ? "current" : status === "rejected" ? "failed" : "done",
        },
        { label: "Verified", state: status === "verified" ? "done" : "todo" },
    ]

    return (
        <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
            {steps.map((step, index) => (
                <li key={step.label} className="grid justify-items-center gap-1.5 text-center">
                    <span className="flex w-full items-center">
                        {/* The line from the step before */}
                        <span className={cn("h-0.5 flex-1", index === 0 ? "invisible" : step.state === "todo" ? "bg-border" : "bg-success")} />
                        <span
                            className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                step.state === "done" && "bg-success text-white",
                                step.state === "current" && "border-2 border-primary bg-primary/10 text-primary",
                                step.state === "failed" && "bg-destructive text-white",
                                step.state === "todo" && "border-2 border-border text-muted-foreground"
                            )}
                        >
                            {step.state === "done" ? (
                                <Check size={14} strokeWidth={3} aria-hidden />
                            ) : step.state === "failed" ? (
                                <X size={14} strokeWidth={3} aria-hidden />
                            ) : (
                                index + 1
                            )}
                        </span>
                        <span
                            className={cn(
                                "h-0.5 flex-1",
                                index === steps.length - 1 ? "invisible" : steps[index + 1].state === "todo" ? "bg-border" : "bg-success"
                            )}
                        />
                    </span>
                    <span className={cn("text-xs", step.state === "todo" ? "text-muted-foreground" : "font-medium")}>
                        {step.label}
                        <span className="sr-only">
                            {step.state === "done" ? ", done" : step.state === "current" ? ", happening now" : step.state === "failed" ? ", failed" : ", to come"}
                        </span>
                    </span>
                </li>
            ))}
        </ol>
    )
}
