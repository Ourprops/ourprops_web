import { cn } from "@/lib/utils"

import BrandMark from "./brand-mark"

type BrandLoaderProps = {
    /** What's happening, e.g. "Signing you in". Read out by screen readers. */
    message: string
    /** Covers the whole screen, for the moment between an action finishing and the next page arriving */
    overlay?: boolean
}

// Shown only once a wait passes this, so a quick action doesn't flash a full-screen loader
const APPEAR_AFTER = "150ms"

// A full loading screen with the animated brand mark. The wait sets how long it shows; nothing pads it out.
export default function BrandLoader({ message, overlay = false }: BrandLoaderProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex flex-col items-center justify-center gap-4 px-5 text-center",
                overlay
                    ? "survey-grid fixed inset-0 z-100 animate-fade-in bg-background motion-reduce:animate-none"
                    : "min-h-[60vh] w-full"
            )}
            style={overlay ? { animationDelay: APPEAR_AFTER } : undefined}
        >
            <BrandMark ping />
            <p className="text-[15px] font-medium text-foreground">{message}…</p>
        </div>
    )
}
