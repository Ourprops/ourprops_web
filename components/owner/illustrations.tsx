// Small drawings for the owner area's moments: a first visit and an empty to-do list. Drawn in the brand colours on
// the survey grid used across OurProps, so they read as property plans, not stock art (docs/design.md avoids generic
// illustration). Decorative: hidden from screen readers, the text beside them says it all. Motion respects reduced motion.

/** A plot on a site plan with a pin dropping onto it: registering a property */
export function PlotIllustration({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 240 150" className={className} aria-hidden>
            <defs>
                <pattern id="plot-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M16 0H0V16" fill="none" stroke="currentColor" strokeOpacity="0.08" />
                </pattern>
            </defs>
            <rect width="240" height="150" rx="14" fill="url(#plot-grid)" className="text-primary" />
            {/* the plot, its boundary drawing in */}
            <path
                d="M62 104 L88 40 L170 52 L184 112 Z"
                pathLength={1}
                strokeDasharray={1}
                className="animate-draw fill-primary/8 stroke-primary motion-reduce:animate-none"
                strokeWidth={2}
                strokeLinejoin="round"
            />
            {/* corner beacons, as on a survey plan */}
            {[[62, 104], [88, 40], [170, 52], [184, 112]].map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" rx="1" className="fill-card stroke-primary" strokeWidth="1.5" />
            ))}
            {/* a document beside it */}
            <g className="animate-rise motion-reduce:animate-none" style={{ animationDelay: "300ms" }}>
                <rect x="186" y="18" width="38" height="48" rx="5" className="fill-card stroke-border" strokeWidth="1.5" />
                <path d="M194 32h22M194 40h22M194 48h14" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
            </g>
            {/* the pin */}
            <g className="animate-pin-drop motion-reduce:animate-none" style={{ animationDelay: "500ms" }}>
                <path d="M124 54c-9.4 0-17 7.3-17 16.4C107 83 124 98 124 98s17-15 17-27.6C141 61.3 133.4 54 124 54z" className="fill-secondary" />
                <circle cx="124" cy="70" r="6" className="fill-card" />
            </g>
        </svg>
    )
}

/** A verified plot with a large tick: nothing left to do */
export function CaughtUpIllustration({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden>
            <rect x="6" y="14" width="44" height="36" rx="6" className="fill-success-soft stroke-success/40" strokeWidth="1.5" transform="rotate(-6 28 32)" />
            <circle cx="44" cy="40" r="14" className="animate-pop-in fill-success motion-reduce:animate-none" />
            <path d="M37.5 40.5l4.5 4.5 8.5-9" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}
