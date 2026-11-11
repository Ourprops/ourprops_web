import { ArrowRight, BadgeCheck, Clock, IdCard, Inbox, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { MAP_STATUS, awaitingReview, formatCount, getAdminDashboard, mapStatus, pipeline, submittedTotal, type MapStatus } from "@/lib/admin/dashboard"
import { requireAdmin } from "@/lib/auth/staff"
import { cn } from "@/lib/utils"

import { PropertyMap } from "./property-map"
import { TrendChart } from "./trend-chart"

export const metadata: Metadata = {
    title: "Overview",
}

// What's going on across OurProps, for the admin: how many owners and properties, whether review keeps up with what
// comes in, where the properties are, and where the backlog sits. One database call (admin_dashboard), totals only.
export default async function OverviewPage() {
    const { supabase } = await requireAdmin()
    const data = await getAdminDashboard(supabase)

    const verified = data.properties.active ?? 0
    const sent = submittedTotal(data.properties)
    const waiting = awaitingReview(data.properties)
    const stages = pipeline(data.properties)
    const widest = Math.max(...stages.map((stage) => stage.count), 1)
    const largestRegion = Math.max(...data.regions.map((region) => region.total), 1)
    const onMap = Object.fromEntries(
        (Object.keys(MAP_STATUS) as MapStatus[]).map((status) => [status, data.points.filter((point) => mapStatus(point.status) === status).length])
    ) as Record<MapStatus, number>
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    return (
        <div className="grid gap-8">
            <header className="grid gap-1.5">
                <h1 className="text-display text-primary">Overview</h1>
                <p className="text-copy">What&apos;s happening across OurProps: owners, properties, how review is keeping up, and where it all is.</p>
            </header>

            {/* the one number the dashboard leads with, then the rest of the headline numbers */}
            <section aria-label="Headline numbers" className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
                <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-card sm:p-6">
                    <div aria-hidden className="survey-grid absolute inset-0 [--grid-line:rgba(255,255,255,0.06)]" />
                    <div className="relative grid gap-2">
                        <p className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                            <BadgeCheck size={16} aria-hidden /> Verified properties
                        </p>
                        <p className="text-6xl font-semibold tracking-tight">{formatCount(verified)}</p>
                        <p className="text-sm text-primary-foreground/75">
                            of {formatCount(sent)} sent to us{sent > 0 ? ` (${Math.round((verified / sent) * 100)}%)` : ""}
                        </p>
                    </div>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                    <Stat icon={Users} label="Owners" value={formatCount(data.users.owners)} note={`${data.users.new_owners_30_days} new in 30 days`} />
                    <Stat icon={Inbox} label="Waiting for review" value={formatCount(waiting)} note="Sent or in review" href="/admin" />
                    <Stat
                        icon={Clock}
                        label="Days to verify"
                        value={data.median_days_to_verify === null ? "—" : data.median_days_to_verify.toFixed(1)}
                        note="Median, last 90 days"
                    />
                    <Stat
                        icon={IdCard}
                        label="Identities to check"
                        value={formatCount(data.identities.unreviewed ?? 0)}
                        note={`${formatCount(data.identities.verified ?? 0)} verified`}
                    />
                </dl>
            </section>

            <Card title="Coming in, and getting verified" subtitle="Properties sent to us and verified, each week for the last 12 weeks">
                <TrendChart weekly={data.weekly} />
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <Card title="Where the properties are" subtitle="Every property sent to us. Click a pin to open its review.">
                    <div className="grid gap-3">
                        {apiKey ? (
                            <PropertyMap apiKey={apiKey} points={data.points} />
                        ) : (
                            <p className="text-sm text-muted-foreground">The map isn&apos;t set up here (no GOOGLE_MAPS_API_KEY).</p>
                        )}
                        {/* the legend: shape, colour and words together, with how many of each are on the map */}
                        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-copy">
                            {(Object.keys(MAP_STATUS) as MapStatus[]).map((status) => (
                                <li key={status} className="flex items-center gap-1.5">
                                    <MapKey status={status} />
                                    {MAP_STATUS[status].label}
                                    <span className="text-muted-foreground tabular-nums">{onMap[status]}</span>
                                </li>
                            ))}
                        </ul>
                        {data.points.length < sent ? (
                            <p className="text-xs text-muted-foreground">
                                {sent - data.points.length} {sent - data.points.length === 1 ? "property has" : "properties have"} no location on the
                                map yet.
                            </p>
                        ) : null}
                    </div>
                </Card>

                <Card title="By region" subtitle="Properties sent to us, most first">
                    {data.regions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No properties yet.</p>
                    ) : (
                        <ul className="grid gap-3">
                            {data.regions.map((region) => (
                                <li key={region.region} className="grid gap-1" title={`${region.region}: ${region.total} sent, ${region.verified} verified`}>
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="truncate">{region.region}</span>
                                        <span className="shrink-0 text-muted-foreground tabular-nums">
                                            <span className="font-semibold text-foreground">{region.total}</span> · {region.verified} verified
                                        </span>
                                    </div>
                                    {/* one hue for magnitude; 4px rounded at the data end, square at the baseline */}
                                    <div className="h-2 overflow-hidden rounded-r-sm bg-muted">
                                        <div
                                            className="h-full rounded-r-[4px] bg-[var(--viz-series-1)]"
                                            style={{ width: `${(region.total / largestRegion) * 100}%` }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Card title="Where the backlog sits" subtitle="Every property by where it is in the review, drafts included">
                <ul className="grid gap-3">
                    {stages.map((stage) => (
                        <li key={stage.status} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[11rem_minmax(0,1fr)_3rem]">
                            <span className="grid">
                                <span className="text-sm font-medium">{stage.label}</span>
                                <span className="text-xs text-muted-foreground">{stage.note}</span>
                            </span>
                            <div className="h-2 overflow-hidden rounded-r-sm bg-muted">
                                <div
                                    className="h-full rounded-r-[4px] bg-[var(--viz-series-1)]"
                                    style={{ width: `${(stage.count / widest) * 100}%` }}
                                />
                            </div>
                            <span className="text-right text-sm font-semibold tabular-nums sm:order-none">{stage.count}</span>
                        </li>
                    ))}
                </ul>
                <Link href="/admin" className="mt-4 flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    Open the review queue <ArrowRight size={14} aria-hidden />
                </Link>
            </Card>
        </div>
    )
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <section className="grid content-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
            <div className="grid gap-0.5">
                <h2 className="font-semibold tracking-tight">{title}</h2>
                <p className="text-sm text-copy">{subtitle}</p>
            </div>
            {children}
        </section>
    )
}

function Stat({ icon: Icon, label, value, note, href }: { icon: typeof Users; label: string; value: string; note: string; href?: string }) {
    const body = (
        <>
            <dt className="flex items-center gap-1.5 text-sm text-copy">
                <Icon size={15} className="text-muted-foreground" aria-hidden />
                {label}
            </dt>
            <dd className="grid gap-0.5">
                <span className="text-3xl font-semibold tracking-tight">{value}</span>
                <span className="text-xs text-muted-foreground">{note}</span>
            </dd>
        </>
    )
    const className = "grid content-start gap-2 rounded-2xl border border-border bg-card p-4 shadow-card"
    return href ? (
        <Link href={href} className={cn(className, "transition-colors hover:border-primary/30")}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    )
}

// The same shape and colour as the pins on the map
function MapKey({ status }: { status: MapStatus }) {
    const { colour, shape } = MAP_STATUS[status]
    return (
        <svg viewBox="-8 -8 16 16" className="size-4 shrink-0" aria-hidden>
            {shape === "circle" ? <circle r={6} fill={colour} stroke="#fff" strokeWidth={2} /> : null}
            {shape === "square" ? <rect x={-5.5} y={-5.5} width={11} height={11} fill={colour} stroke="#fff" strokeWidth={2} /> : null}
            {shape === "diamond" ? <path d="M0 -7.5 L7.5 0 L0 7.5 L-7.5 0 Z" fill={colour} stroke="#fff" strokeWidth={2} /> : null}
        </svg>
    )
}
