"use client"

import { useEffect } from "react"

import { markNotificationsSeen } from "./actions"

// Once the dashboard has shown new updates, they are marked seen in the background. They stay marked "New" on this
// visit, so the owner still sees which ones are new; next time they're not.
export function MarkSeen({ ids }: { ids: string[] }) {
    const key = ids.join(",")
    useEffect(() => {
        if (key) void markNotificationsSeen(key.split(","))
    }, [key])
    return null
}
