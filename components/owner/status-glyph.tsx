import { cn } from "@/lib/utils"

// A property's status as a small circle that fills as it moves along, after Linear's issue icons: dashed while it's a
// draft, a quarter once sent, half while it's checked (orange when we need the owner), full and ticked once verified.
// Always next to the status in words; it never carries the meaning alone.
export function StatusGlyph({ status, className }: { status: string; className?: string }) {
    const size = 18
    const centre = size / 2

    if (status === "active") {
        return (
            <svg viewBox={`0 0 ${size} ${size}`} className={cn("size-[18px] shrink-0", className)} aria-hidden>
                <circle cx={centre} cy={centre} r={8} className="fill-success" />
                <path d="M5.6 9.2l2.2 2.2 4.6-4.8" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    }

    if (status === "suspended") {
        return (
            <svg viewBox={`0 0 ${size} ${size}`} className={cn("size-[18px] shrink-0", className)} aria-hidden>
                <circle cx={centre} cy={centre} r={8} className="fill-warning" />
                <path d="M7.2 6v6M10.8 6v6" stroke="white" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
        )
    }

    // How much of the inner circle is filled, drawn as a thick stroke the size of its own radius
    const fraction = status === "submitted" ? 0.25 : status === "under_review" || status === "action_required" ? 0.5 : 0
    const inner = 3.5
    const circumference = 2 * Math.PI * inner
    const tone = status === "action_required" ? "stroke-secondary" : "stroke-primary"

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className={cn("size-[18px] shrink-0", className)} aria-hidden>
            <circle
                cx={centre}
                cy={centre}
                r={7.5}
                fill="none"
                strokeWidth={1.5}
                className={status === "draft" ? "stroke-muted-foreground" : tone}
                strokeDasharray={status === "draft" ? "2.4 2.2" : undefined}
            />
            {fraction > 0 ? (
                <circle
                    cx={centre}
                    cy={centre}
                    r={inner}
                    fill="none"
                    strokeWidth={inner * 2}
                    className={tone}
                    strokeDasharray={`${circumference * fraction} ${circumference}`}
                    transform={`rotate(-90 ${centre} ${centre})`}
                />
            ) : null}
        </svg>
    )
}
