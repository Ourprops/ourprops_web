import { Check, CircleDashed, Clock, MapPin, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * Product UI shown on the homepage. These are the patterns the app itself will use
 * for property records, so keep them presentational and data-driven.
 */

export type RecordStatus = "complete" | "in-review" | "pending"

const STATUS_STYLES: Record<RecordStatus, { label: string; icon: LucideIcon; className: string }> = {
    complete: { label: "Complete", icon: Check, className: "bg-success-soft text-success" },
    "in-review": { label: "In review", icon: Clock, className: "bg-warning-soft text-warning" },
    pending: { label: "Pending", icon: CircleDashed, className: "bg-background text-copy ring-1 ring-border" },
}

// Status is carried by the icon and label as well as the colour
export function StatusBadge({ status, className }: { status: RecordStatus; className?: string }) {
    const { label, icon: Icon, className: tone } = STATUS_STYLES[status]

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                tone,
                className
            )}
        >
            <Icon size={12} strokeWidth={2.5} aria-hidden />
            {label}
        </span>
    )
}

export function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-foreground tabular-nums">{value}</dd>
        </div>
    )
}

export function DocumentRow({
    icon: Icon,
    name,
    detail,
    status,
}: {
    icon: LucideIcon
    name: string
    detail: string
    status: RecordStatus
}) {
    return (
        <li className="flex items-center gap-3 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary ring-1 ring-border">
                <Icon size={17} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{detail}</span>
            </span>
            <StatusBadge status={status} />
        </li>
    )
}

export function PropertyHeader({
    name,
    type,
    location,
    status,
}: {
    name: string
    type: string
    location: string
    status: RecordStatus
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{name}</h3>
                    <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] font-medium text-copy ring-1 ring-border">
                        {type}
                    </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-copy">
                    <MapPin size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                    {location}
                </p>
            </div>
            <StatusBadge status={status} />
        </div>
    )
}

// A quiet, decorative map: light ground, simple roads, and one highlighted parcel
export function BoundaryMap({ className, coordinates }: { className?: string; coordinates?: string }) {
    return (
        <div
            className={cn("relative overflow-hidden rounded-xl bg-[#EEF2F6] ring-1 ring-border", className)}
            role="img"
            aria-label="Map preview showing the property's mapped boundary"
        >
            <svg
                className="absolute inset-0 size-full"
                viewBox="0 0 480 300"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden
            >
                {/* Neighbouring plots */}
                <g fill="#E1E7EF">
                    <path d="M24 -10h104l-4 66H20z" />
                    <path d="M144 -10h112l-4 64H140z" />
                    <path d="M316 -10h80l2 62h-84z" />
                    <path d="M412 -10h64v60h-66z" />
                    <path d="M14 104h76l-4 92H10z" />
                    <path d="M316 100h84l-4 96h-82z" />
                    <path d="M414 104h62v90h-66z" />
                    <path d="M24 232h118l-4 78H20z" />
                    <path d="M160 236h96l-2 74h-96z" />
                    <path d="M316 236h160v74H312z" />
                </g>
                {/* Roads */}
                <g fill="none" stroke="#FFFFFF" strokeLinecap="round">
                    <path d="M-20 80C90 66 190 92 290 78S430 60 500 72" strokeWidth="18" />
                    <path d="M290 -20 296 320" strokeWidth="14" />
                    <path d="M-20 216C80 212 180 220 300 214" strokeWidth="8" />
                </g>
                {/* The property */}
                <path
                    d="M116 108l130 6-8 88-126-8z"
                    fill="rgba(255,107,53,0.14)"
                    stroke="#FF6B35"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                />
                <g fill="#FFFFFF" stroke="#FF6B35" strokeWidth="2">
                    <circle cx="116" cy="108" r="4" />
                    <circle cx="246" cy="114" r="4" />
                    <circle cx="238" cy="202" r="4" />
                    <circle cx="112" cy="194" r="4" />
                </g>
            </svg>

            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-card/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-xs">
                <span className="size-2 rounded-sm border-2 border-secondary" aria-hidden />
                Boundary mapped
            </span>

            {coordinates && (
                <span className="absolute bottom-3 right-3 max-w-[70%] truncate rounded-md bg-card/90 px-2 py-0.5 font-mono text-[11px] text-copy shadow-xs">
                    {coordinates}
                </span>
            )}
        </div>
    )
}

// Example record used across the homepage
export const SAMPLE_PROPERTY = {
    name: "East Legon Residence",
    type: "Residential",
    location: "East Legon, Accra",
    status: "in-review" as RecordStatus,
    coordinates: "5°38′42.8″N 0°09′14.1″W",
    details: [
        { label: "Plot area", value: "1,240 m²" },
        { label: "Parcel ID", value: "GA-049-3821" },
        { label: "Tenure", value: "Freehold" },
    ],
}
