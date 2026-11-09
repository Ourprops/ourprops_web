import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

// A tick for something done, an empty circle for something still to do. Says which in words too, for screen readers.
export function ChecklistMark({ done, className }: { done: boolean; className?: string }) {
    return (
        <span
            className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                done ? "bg-success text-white" : "border-2 border-border",
                className
            )}
        >
            {done ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
            <span className="sr-only">{done ? "Done:" : "To do:"}</span>
        </span>
    )
}
