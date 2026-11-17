"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

// Makes boxes marked with reveal() (lib/reveal.ts) float up as they scroll into view. Progressive: the page is fully
// visible as the server sends it. Only once this runs are boxes below the screen hidden to wait for their moment, so
// nothing stays invisible without JavaScript, and nothing already on screen flashes. People who ask their device for
// less motion get no animation at all. Runs again on each page, since the layout stays mounted between pages.
export default function RevealOnScroll() {
    const pathname = usePathname()

    useEffect(() => {
        if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue
                    entry.target.classList.remove("reveal-pending")
                    entry.target.classList.add("reveal-in")
                    observer.unobserve(entry.target)
                }
            },
            // a little before the box is fully in, so it's moving as it arrives
            { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
        )

        for (const box of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
            if (box.classList.contains("reveal-in")) continue
            // already on screen: leave it be
            if (box.getBoundingClientRect().top < window.innerHeight) continue
            box.classList.add("reveal-pending")
            observer.observe(box)
        }

        return () => observer.disconnect()
    }, [pathname])

    return null
}
