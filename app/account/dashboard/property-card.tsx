import { ChevronRight, MapPin } from "lucide-react"
import Link from "next/link"

import { PropertyProgress } from "@/components/owner/property-progress"
import { ShareRecord } from "@/components/owner/share-record"
import { buttonVariants } from "@/components/ui/button"
import { STATUS_EXPLAINED } from "@/lib/owner/dashboard"
import type { OwnPropertySummary } from "@/lib/supabase/owner-properties"

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

// One property: where it is, how far it has got, and what happens next. A verified one can be shared.
export function PropertyCard({ property }: { property: OwnPropertySummary }) {
    const href =
        property.status === "draft" ? `/account/dashboard/properties/new?draft=${property.id}` : `/account/dashboard/properties/${property.id}`
    const explained = STATUS_EXPLAINED[property.status] ?? { label: property.status, next: "" }
    const place = [property.city_town, property.region].filter(Boolean).join(", ")

    return (
        <li className="grid gap-4 rounded-xl border border-border bg-card p-4">
            <Link href={href} className="group flex items-start justify-between gap-3">
                <span className="grid min-w-0 gap-0.5">
                    <span className="font-medium group-hover:text-primary wrap-anywhere">{property.name ?? "Untitled property"}</span>
                    {place ? (
                        <span className="flex items-center gap-1 text-sm text-copy">
                            <MapPin size={14} className="shrink-0" aria-hidden /> {place}
                        </span>
                    ) : null}
                    {property.status !== "draft" ? <span className="text-data text-xs text-muted-foreground">{property.prop_id}</span> : null}
                </span>
                <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
            </Link>

            <PropertyProgress status={property.status} />

            <div className="grid gap-0.5 text-sm">
                <p className="font-medium">{explained.label}</p>
                <p className="text-copy">
                    {explained.next}
                    <span className="text-muted-foreground"> · Updated {dateFormat.format(new Date(property.updated_at))}</span>
                </p>
            </div>

            {property.status === "active" ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Link href={`/record/${property.prop_id}`} className={buttonVariants({ className: "h-10" })}>
                        View public record
                    </Link>
                    <ShareRecord path={`/record/${property.prop_id}`} name={property.name ?? "My property"} />
                </div>
            ) : null}
        </li>
    )
}
