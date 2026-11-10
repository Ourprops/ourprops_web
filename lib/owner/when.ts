const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" })
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })

/** "just now", "2 hours ago", "yesterday", then the date once it's a week old */
export function when(createdAt: string, now = Date.now()) {
    const minutes = Math.round((now - Date.parse(createdAt)) / 60_000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return relative.format(-minutes, "minute")
    const hours = Math.round(minutes / 60)
    if (hours < 24) return relative.format(-hours, "hour")
    const days = Math.round(hours / 24)
    if (days < 7) return relative.format(-days, "day")
    return dateFormat.format(new Date(createdAt))
}
