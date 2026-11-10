// How the review queue is grouped and how long each property has waited. Pure, so it can be tested.

import type { QueueItem } from "@/lib/admin/review"

export const QUEUE_FILTERS = [
    { key: "all", label: "All", match: () => true },
    { key: "to_start", label: "To start", match: (item: QueueItem) => item.status === "submitted" },
    { key: "in_review", label: "In review", match: (item: QueueItem) => item.status === "under_review" },
    { key: "waiting", label: "Waiting on owner", match: (item: QueueItem) => item.status === "action_required" },
    { key: "overlaps", label: "With overlaps", match: (item: QueueItem) => item.openOverlaps > 0 },
] as const

export type QueueFilter = (typeof QUEUE_FILTERS)[number]["key"]

export function isQueueFilter(value: unknown): value is QueueFilter {
    return QUEUE_FILTERS.some((filter) => filter.key === value)
}

export function filterQueue(queue: QueueItem[], filter: QueueFilter): QueueItem[] {
    const match = QUEUE_FILTERS.find((each) => each.key === filter)?.match ?? (() => true)
    return queue.filter(match)
}

export function queueCounts(queue: QueueItem[]): Record<QueueFilter, number> {
    return Object.fromEntries(QUEUE_FILTERS.map((filter) => [filter.key, queue.filter(filter.match).length])) as Record<QueueFilter, number>
}

/** Whole days since it was submitted, or null if there's no submission date */
export function daysWaiting(submittedAt: string | null, now = Date.now()): number | null {
    if (!submittedAt) return null
    return Math.max(0, Math.floor((now - Date.parse(submittedAt)) / 86_400_000))
}

/** A week or more is long enough to flag in the queue */
export const LONG_WAIT_DAYS = 7
