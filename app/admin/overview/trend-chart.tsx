"use client"

import { useId, useMemo, useState } from "react"

import type { Dashboard } from "@/lib/admin/dashboard"

// Properties sent to us and properties verified, week by week: is demand growing, and is review keeping up?
// Two series on one axis (same unit, same scale), after the dataviz skill: 2px lines, hairline grid, a legend and
// end labels, a crosshair that snaps to the nearest week with one readout for both, the same by keyboard, and a table.
// Colours: categorical slots 1 and 2 of the reference palette, validated against the light surface (--viz-*).

const SERIES = [
    { key: "submitted", label: "Sent to us", colour: "var(--viz-series-1)" },
    { key: "verified", label: "Verified", colour: "var(--viz-series-2)" },
] as const

const WIDTH = 640
const HEIGHT = 220
const PAD = { top: 16, right: 92, bottom: 28, left: 36 }

const weekFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })

/** A clean top for the axis: 4, 5, 10, 20, 50… at least the largest value */
function niceMax(value: number) {
    if (value <= 4) return 4
    const magnitude = 10 ** Math.floor(Math.log10(value))
    for (const step of [1, 2, 2.5, 5, 10]) {
        if (step * magnitude >= value) return step * magnitude
    }
    return 10 * magnitude
}

export function TrendChart({ weekly }: { weekly: Dashboard["weekly"] }) {
    const titleId = useId()
    const [active, setActive] = useState<number | null>(null)

    const { max, x, y, paths } = useMemo(() => {
        const top = niceMax(Math.max(...weekly.flatMap((week) => [week.submitted, week.verified]), 0))
        const innerWidth = WIDTH - PAD.left - PAD.right
        const innerHeight = HEIGHT - PAD.top - PAD.bottom
        const xAt = (index: number) => PAD.left + (weekly.length < 2 ? 0 : (index / (weekly.length - 1)) * innerWidth)
        const yAt = (value: number) => PAD.top + innerHeight - (value / top) * innerHeight
        return {
            max: top,
            x: xAt,
            y: yAt,
            paths: SERIES.map((series) =>
                weekly.map((week, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(week[series.key])}`).join(" ")
            ),
        }
    }, [weekly])

    if (weekly.length === 0) return null

    const ticks = [0, max / 4, max / 2, (3 * max) / 4, max].filter((tick) => Number.isInteger(tick))
    const last = weekly.length - 1
    const endY = SERIES.map((series) => y(weekly[last][series.key]))
    // end labels only where they don't collide; the legend and readout carry them otherwise
    const endLabelsFit = Math.abs(endY[0] - endY[1]) >= 14

    function pick(clientX: number, box: DOMRect) {
        const relative = ((clientX - box.left) / box.width) * WIDTH
        const index = Math.round(((relative - PAD.left) / (WIDTH - PAD.left - PAD.right)) * last)
        setActive(Math.min(last, Math.max(0, index)))
    }

    const shown = active ?? null

    return (
        <figure className="grid gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-copy" aria-hidden>
                {SERIES.map((series) => (
                    <span key={series.key} className="flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded-full" style={{ background: series.colour }} />
                        {series.label}
                    </span>
                ))}
            </div>

            <div className="relative">
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    className="h-auto w-full touch-pan-y outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    role="img"
                    aria-labelledby={titleId}
                    tabIndex={0}
                    onPointerMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(last)}
                    onBlur={() => setActive(null)}
                    onKeyDown={(event) => {
                        if (event.key === "ArrowLeft") setActive((current) => Math.max(0, (current ?? last) - 1))
                        if (event.key === "ArrowRight") setActive((current) => Math.min(last, (current ?? last) + 1))
                    }}
                >
                    <title id={titleId}>
                        Properties sent to us and verified each week, for the last {weekly.length} weeks. Use the arrow keys to read each
                        week, or open the table below.
                    </title>

                    {/* recessive hairline grid and ticks */}
                    {ticks.map((tick) => (
                        <g key={tick}>
                            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--viz-grid)" strokeWidth={1} />
                            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                                {tick}
                            </text>
                        </g>
                    ))}
                    {weekly.map((week, index) =>
                        index % 3 === last % 3 ? (
                            <text
                                key={week.week}
                                x={x(index)}
                                y={HEIGHT - 8}
                                textAnchor="middle"
                                className="fill-muted-foreground text-[11px]"
                            >
                                {weekFormat.format(new Date(week.week))}
                            </text>
                        ) : null
                    )}

                    {shown !== null ? (
                        <line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="var(--viz-crosshair)" strokeWidth={1} />
                    ) : null}

                    {SERIES.map((series, seriesIndex) => (
                        <g key={series.key}>
                            <path d={paths[seriesIndex]} fill="none" stroke={series.colour} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                            {/* the end marker, ringed in the surface so it stays legible where the lines meet */}
                            <circle cx={x(last)} cy={endY[seriesIndex]} r={4} fill={series.colour} stroke="var(--viz-surface)" strokeWidth={2} />
                            {shown !== null ? (
                                <circle cx={x(shown)} cy={y(weekly[shown][series.key])} r={4} fill={series.colour} stroke="var(--viz-surface)" strokeWidth={2} />
                            ) : null}
                            {endLabelsFit ? (
                                <text x={x(last) + 10} y={endY[seriesIndex]} dy="0.32em" className="fill-foreground text-[12px] font-medium">
                                    {series.label} {weekly[last][series.key]}
                                </text>
                            ) : null}
                        </g>
                    ))}
                </svg>

                {shown !== null ? (
                    <div
                        role="status"
                        className="pointer-events-none absolute top-0 grid min-w-36 gap-1 rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg"
                        style={{
                            left: `${(x(shown) / WIDTH) * 100}%`,
                            transform: shown > last / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                        }}
                    >
                        <span className="text-xs text-muted-foreground">Week of {weekFormat.format(new Date(weekly[shown].week))}</span>
                        {SERIES.map((series) => (
                            <span key={series.key} className="flex items-center gap-2">
                                <span className="h-0.5 w-3 rounded-full" style={{ background: series.colour }} aria-hidden />
                                <span className="font-semibold tabular-nums">{weekly[shown][series.key]}</span>
                                <span className="text-copy">{series.label}</span>
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>

            <details className="text-sm">
                <summary className="cursor-pointer text-primary">Show as table</summary>
                <table className="mt-2 w-full text-left tabular-nums">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1 font-normal">Week of</th>
                            {SERIES.map((series) => (
                                <th key={series.key} className="py-1 text-right font-normal">
                                    {series.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {weekly.map((week) => (
                            <tr key={week.week}>
                                <td className="py-1">{weekFormat.format(new Date(week.week))}</td>
                                {SERIES.map((series) => (
                                    <td key={series.key} className="py-1 text-right">
                                        {week[series.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </figure>
    )
}
