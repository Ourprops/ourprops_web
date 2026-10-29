import { cn } from "@/lib/utils"

// Shared by every animated part: SVG transforms scale and move around the part's own box, not the canvas
const PART = "origin-center [transform-box:fill-box] motion-reduce:animate-none"

// The pin's inner lines, from public/logo.svg, drawn in one after another
const PIN_LINES = [
    "M30.2242 63.7509L53.7806 97.2858",
    "M43.087 56.2772L63.6225 83.2584",
    "M53.9011 49.8124L74.5411 64.2029",
    "M26.1027 49.5864V25.1394L42.0025 17.246L41.3919 42.4032",
    "M57.2755 51.8866L58.1191 25.3412L43.4004 17.246L42.5648 42.9843",
]

// A plot on the ground around the pin's tip, seen at an angle
const PLOT = "M4 112L66 100L96 116L34 132Z"

type BrandMarkProps = {
    /** Keeps a location ping rippling from the pin once it lands, to show something is still happening */
    ping?: boolean
    /** Draws the plot's boundary as broken and grey, for error pages; nothing animates */
    lost?: boolean
    className?: string
}

/*
 * The OurProps pin dropping onto a plot: the pin lands, its lines draw in, then the plot's boundary
 * traces around it in orange, like the boundaries owners map in the app. About 1.3s, then still.
 * Decorative, so it's hidden from assistive tech; the screen around it says what's happening.
 */
export default function BrandMark({ ping = false, lost = false, className }: BrandMarkProps) {
    const animate = !lost

    return (
        <svg viewBox="-28 -30 140 170" className={cn("size-28", className)} fill="none" aria-hidden>
            {/* The plot: its boundary draws in after the pin lands */}
            <path
                d={PLOT}
                pathLength={1}
                className={cn(
                    "[stroke-dasharray:1]",
                    lost ? "fill-transparent stroke-muted-foreground" : "fill-secondary/10 stroke-secondary",
                    animate && cn(PART, "animate-draw")
                )}
                style={{
                    strokeWidth: 2,
                    strokeLinejoin: "round",
                    // A broken line for "lost"; otherwise the dash pattern is what draws it in
                    ...(lost ? { strokeDasharray: "0.04 0.03" } : { animationDelay: "650ms", animationDuration: "650ms" }),
                }}
            />

            {/* Corner pegs, like boundary pillars, appear as the line reaches them */}
            {!lost &&
                [
                    [4, 112],
                    [66, 100],
                    [96, 116],
                    [34, 132],
                ].map(([cx, cy], index) => (
                    <circle
                        key={`${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={2.5}
                        className={cn(PART, "animate-pop-in fill-card stroke-secondary")}
                        style={{ strokeWidth: 1.5, animationDelay: `${700 + index * 150}ms` }}
                    />
                ))}

            {/* Where the pin touches the ground: a shadow that firms up as it lands, then the ping */}
            <ellipse
                cx={44}
                cy={110}
                rx={9}
                ry={3}
                className={cn("fill-primary/25", animate && cn(PART, "animate-fade-in"))}
                style={{ animationDelay: "250ms" }}
            />
            {ping && (
                <ellipse
                    cx={44}
                    cy={110}
                    rx={10}
                    ry={3.5}
                    className={cn(PART, "animate-ping-ring stroke-secondary motion-reduce:hidden")}
                    style={{ strokeWidth: 1.5, animationDelay: "1300ms" }}
                />
            )}

            {/* The pin */}
            <g className={cn(animate && cn(PART, "animate-pin-drop"), lost && "opacity-60")}>
                <path
                    d="M82.1677 41.8108C82.0389 52.0999 75.155 64.1615 70.5979 72.1462C68.3435 76.1023 66.3065 79.0835 63.1825 83.652C55.7511 94.5212 49.0201 103.118 44.1973 109C44.1973 109 2 63.799 2 41.8108C2 19.8226 19.9466 2 42.0879 2C64.2292 2 82.3771 25.1323 82.1758 41.8108H82.1677Z"
                    fill="#003366"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                />
                <path
                    d="M53.7565 49.7559L14.8869 71.378L7.10172 58.5613L41.1187 41.8705L53.7565 49.7559Z"
                    fill={lost ? "#7B8794" : "#FF6B35"}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    className={cn(animate && cn(PART, "animate-pop-in"))}
                    style={{ animationDelay: "420ms" }}
                />
                {PIN_LINES.map((d, index) => (
                    <path
                        key={d}
                        d={d}
                        pathLength={1}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        className={cn("[stroke-dasharray:1]", animate && cn(PART, "animate-draw"))}
                        style={{ animationDelay: `${300 + index * 70}ms`, animationDuration: "500ms" }}
                    />
                ))}
            </g>
        </svg>
    )
}
