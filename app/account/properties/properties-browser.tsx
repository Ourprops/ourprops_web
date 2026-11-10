"use client"

import { ChevronRight, MapPin, Search, X } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { StatusGlyph } from "@/components/owner/status-glyph"
import { Input } from "@/components/ui/input"
import { STATUS_EXPLAINED } from "@/lib/owner/dashboard"
import { PROPERTY_FILTERS, filterCounts, filterProperties, type PropertyFilter } from "@/lib/owner/property-filters"
import { when } from "@/lib/owner/when"
import type { OwnPropertySummary } from "@/lib/supabase/owner-properties"
import { cn } from "@/lib/utils"

function hrefFor(property: OwnPropertySummary) {
    return property.status === "draft" ? `/account/dashboard/properties/new?draft=${property.id}` : `/account/dashboard/properties/${property.id}`
}

// All of the owner's properties, to find and open one: search, filters with counts, and a row each, as Linear lists
// issues. Filtering happens in the browser: an owner's list is small, and it answers as they type.
export function PropertiesBrowser({ properties, initialFilter }: { properties: OwnPropertySummary[]; initialFilter: PropertyFilter }) {
    const [filter, setFilter] = useState<PropertyFilter>(initialFilter)
    const [search, setSearch] = useState("")
    const counts = useMemo(() => filterCounts(properties), [properties])
    const shown = useMemo(() => filterProperties(properties, filter, search), [properties, filter, search])

    return (
        <div className="grid gap-4">
            <div className="grid gap-3">
                <div className="relative sm:max-w-sm">
                    <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name, reference or town"
                        aria-label="Search your properties"
                        className="h-11 bg-card pl-9 text-base sm:h-10 sm:text-sm"
                    />
                </div>
                {/* scrolls sideways on a phone rather than wrapping into a wall of chips */}
                <div role="group" aria-label="Show" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    {PROPERTY_FILTERS.filter((each) => each.key === "all" || counts[each.key] > 0).map((each) => {
                        const active = filter === each.key
                        return (
                            <button
                                key={each.key}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setFilter(each.key)}
                                className={cn(
                                    "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-copy hover:text-foreground"
                                )}
                            >
                                {each.label}
                                <span className={cn("tabular-nums", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{counts[each.key]}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {shown.length === 0 ? (
                <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
                    <p className="font-medium">No properties match</p>
                    <p className="text-sm text-copy">Try another search, or show all your properties.</p>
                    <button
                        type="button"
                        onClick={() => {
                            setSearch("")
                            setFilter("all")
                        }}
                        className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                        <X size={14} aria-hidden /> Clear search and filters
                    </button>
                </div>
            ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                    {shown.map((property) => {
                        const place = [property.city_town, property.region].filter(Boolean).join(", ")
                        const explained = STATUS_EXPLAINED[property.status] ?? { label: property.status, next: "" }
                        return (
                            <li key={property.id}>
                                <Link
                                    href={hrefFor(property)}
                                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted sm:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)_7rem_auto] sm:px-5"
                                >
                                    <StatusGlyph status={property.status} />
                                    <span className="grid min-w-0 gap-0.5">
                                        <span className="truncate font-medium group-hover:text-primary">{property.name ?? "Untitled property"}</span>
                                        <span className="flex min-w-0 items-center gap-1 text-sm text-copy">
                                            {place ? (
                                                <>
                                                    <MapPin size={13} className="shrink-0" aria-hidden /> <span className="truncate">{place}</span>
                                                </>
                                            ) : null}
                                            {/* on a phone the status sits under the name */}
                                            <span className="truncate sm:hidden">
                                                {place ? " · " : ""}
                                                {explained.label}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="hidden min-w-0 text-sm sm:block">
                                        <span className={cn("font-medium", property.status === "action_required" && "text-[color-mix(in_oklab,var(--secondary),black_25%)]")}>
                                            {explained.label}
                                        </span>
                                        <span className="text-data block truncate text-xs text-muted-foreground">
                                            {property.status === "draft" ? "No reference yet" : property.prop_id}
                                        </span>
                                    </span>
                                    <span className="hidden text-right text-xs text-muted-foreground tabular-nums sm:block">{when(property.updated_at)}</span>
                                    <ChevronRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
