import { ArrowUpRight, ChevronRight, MapPin } from "lucide-react"
import Link from "next/link"

import { PropertyProgress } from "@/components/owner/property-progress"
import { ShareRecord } from "@/components/owner/share-record"
import { StatusGlyph } from "@/components/owner/status-glyph"
import { buttonVariants } from "@/components/ui/button"
import { STATUS_EXPLAINED } from "@/lib/owner/dashboard"
import type { OwnPropertySummary } from "@/lib/supabase/owner-properties"
import { cn } from "@/lib/utils"

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

// One property: where it is, how far it has got, and what happens next. A verified one can be shared.
export function PropertyCard({ property, index = 0 }: { property: OwnPropertySummary; index?: number }) {
    const href =
        property.status === "draft" ? `/account/dashboard/properties/new?draft=${property.id}` : `/account/dashboard/properties/${property.id}`
    const explained = STATUS_EXPLAINED[property.status] ?? { label: property.status, next: "" }
    const place = [property.city_town, property.region].filter(Boolean).join(", ")
    const verified = property.status === "active"

    return (
        <li
            className={cn(
                "animate-rise grid gap-4 rounded-2xl border bg-card p-4 shadow-card motion-reduce:animate-none sm:p-5",
                verified ? "border-success/30" : "border-border"
            )}
            style={{ animationDelay: `${160 + index * 60}ms` }}
        >
            <Link href={href} className="group -m-1 flex items-start justify-between gap-3 rounded-lg p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <span className="flex min-w-0 gap-3">
                    <StatusGlyph status={property.status} className="mt-0.5" />
                    <span className="grid min-w-0 gap-1">
                        <span className="font-semibold tracking-tight group-hover:text-primary wrap-anywhere">{property.name ?? "Untitled property"}</span>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-copy">
                            {place ? (
                                <span className="flex items-center gap-1">
                                    <MapPin size={13} className="shrink-0" aria-hidden /> {place}
                                </span>
                            ) : null}
                            {property.status !== "draft" ? <span className="text-data text-xs text-muted-foreground">{property.prop_id}</span> : null}
                        </span>
                    </span>
                </span>
                <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
            </Link>

            <PropertyProgress status={property.status} />

            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                <p>
                    <span className="font-medium">{explained.label}</span>
                    <span className="text-copy"> · {explained.next}</span>
                </p>
                <span className="text-xs text-muted-foreground">Updated {dateFormat.format(new Date(property.updated_at))}</span>
            </div>

            {verified ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Link href={`/record/${property.prop_id}`} className={buttonVariants({ variant: "cta", className: "h-10 px-4" })}>
                        View public record <ArrowUpRight aria-hidden />
                    </Link>
                    <ShareRecord path={`/record/${property.prop_id}`} name={property.name ?? "My property"} />
                </div>
            ) : null}
        </li>
    )
}
