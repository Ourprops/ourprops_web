// The Properties page's filters: the same groups an owner thinks in, each from the statuses that belong to it

import type { OwnPropertySummary } from "@/lib/supabase/owner-properties"

export const PROPERTY_FILTERS = [
    { key: "all", label: "All", statuses: null },
    { key: "needs_you", label: "Needs you", statuses: ["action_required"] },
    { key: "checking", label: "Being checked", statuses: ["submitted", "under_review"] },
    { key: "verified", label: "Verified", statuses: ["active"] },
    { key: "paused", label: "Paused", statuses: ["suspended"] },
    { key: "drafts", label: "Drafts", statuses: ["draft"] },
] as const

export type PropertyFilter = (typeof PROPERTY_FILTERS)[number]["key"]

export function isPropertyFilter(value: unknown): value is PropertyFilter {
    return PROPERTY_FILTERS.some((filter) => filter.key === value)
}

/** The properties in a filter whose name, reference or place contains the search, ignoring case and spaces at the ends */
export function filterProperties(properties: OwnPropertySummary[], filter: PropertyFilter, search: string): OwnPropertySummary[] {
    const statuses = PROPERTY_FILTERS.find((each) => each.key === filter)?.statuses ?? null
    const term = search.trim().toLowerCase()
    return properties.filter(
        (property) =>
            (statuses === null || (statuses as readonly string[]).includes(property.status)) &&
            (term === "" ||
                [property.name, property.prop_id, property.city_town, property.region].some((field) => field?.toLowerCase().includes(term)))
    )
}

/** How many properties each filter holds, for the counts beside them */
export function filterCounts(properties: OwnPropertySummary[]): Record<PropertyFilter, number> {
    return Object.fromEntries(PROPERTY_FILTERS.map((filter) => [filter.key, filterProperties(properties, filter.key, "").length])) as Record<
        PropertyFilter,
        number
    >
}
