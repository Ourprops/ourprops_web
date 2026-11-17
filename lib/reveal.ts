import type { CSSProperties } from "react"

/**
 * Marks a box to float up as it scrolls into view (app/(public)/_components/reveal-on-scroll.tsx does the watching).
 * index staggers boxes in a row: each arrives a beat after the one before. Spread it onto the element:
 * <li {...reveal(index)}>. Not in the client component's file, so server components can call it.
 */
export function reveal(index = 0) {
    return { "data-reveal": "", style: { "--reveal-delay": `${Math.min(index, 6) * 90}ms` } as CSSProperties }
}
