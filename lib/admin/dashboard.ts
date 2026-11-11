// The admin dashboard's numbers (admin_dashboard() in the database) and what the page works out from them.
// Pure apart from the one fetch, so the working-out can be tested.

import type { SupabaseClient } from "@supabase/supabase-js"

export type DashboardPoint = { id: string; name: string | null; status: string; lat: number; lng: number }

export type Dashboard = {
    users: { owners: number; developers: number; admins: number; new_owners_30_days: number }
    properties: Partial<Record<string, number>>
    weekly: { week: string; submitted: number; verified: number }[]
    median_days_to_verify: number | null
    regions: { region: string; total: number; verified: number }[]
    identities: Partial<Record<"unreviewed" | "verified" | "rejected", number>>
    points: DashboardPoint[]
}

export async function getAdminDashboard(supabase: SupabaseClient): Promise<Dashboard> {
    const { data, error } = await supabase.rpc("admin_dashboard")
    if (error) throw error
    return data as Dashboard
}

// The review, in the order a property moves through it
export const PIPELINE = [
    { status: "draft", label: "Drafts", note: "Started, not sent yet" },
    { status: "submitted", label: "Sent", note: "Waiting for a reviewer" },
    { status: "under_review", label: "In review", note: "Being checked" },
    { status: "action_required", label: "Waiting on owner", note: "We asked for something" },
    { status: "active", label: "Verified", note: "Live, with a public record" },
    { status: "suspended", label: "Paused", note: "Being checked again" },
] as const

export function pipeline(properties: Dashboard["properties"]) {
    return PIPELINE.map((stage) => ({ ...stage, count: properties[stage.status] ?? 0 }))
}

/** Properties out of draft: everything sent to us */
export function submittedTotal(properties: Dashboard["properties"]) {
    return Object.entries(properties).reduce((sum, [status, count]) => (status === "draft" ? sum : sum + (count ?? 0)), 0)
}

/** Properties a reviewer has to act on: sent, or in review */
export function awaitingReview(properties: Dashboard["properties"]) {
    return (properties.submitted ?? 0) + (properties.under_review ?? 0)
}

/** How the map shows each status: colour (validated with the dataviz palette script) and a shape, so colour isn't alone */
export const MAP_STATUS = {
    active: { label: "Verified", colour: "#0ca30c", shape: "circle" },
    checking: { label: "Being checked", colour: "#2a78d6", shape: "square" },
    suspended: { label: "Paused", colour: "#eda100", shape: "diamond" },
} as const

export type MapStatus = keyof typeof MAP_STATUS

export function mapStatus(status: string): MapStatus {
    if (status === "active") return "active"
    if (status === "suspended") return "suspended"
    return "checking"
}

const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 })

/** In full below 10,000 (1,284), compact above it (12.9K) */
export function formatCount(value: number) {
    // en-GB writes "12.9k"; capitals read better beside other figures
    return value < 10_000 ? value.toLocaleString("en-GB") : compact.format(value).toUpperCase()
}
