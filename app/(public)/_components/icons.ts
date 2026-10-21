import {
    BriefcaseBusiness,
    Building2,
    Circle,
    Compass,
    FileText,
    FolderOpen,
    FolderUp,
    House,
    Lock,
    LockKeyhole,
    MapPinned,
    Search,
    Share2,
    ShieldCheck,
    SquarePlus,
    Users,
    Waypoints,
    type LucideIcon,
} from "lucide-react"

// Keys match ICON_OPTIONS in sanity/schemaTypes/objects/icon.ts
const ICONS: Record<string, LucideIcon> = {
    BriefcaseBusiness,
    Building2,
    Compass,
    FileText,
    FolderOpen,
    FolderUp,
    House,
    Lock,
    LockKeyhole,
    MapPinned,
    Search,
    Share2,
    ShieldCheck,
    SquarePlus,
    Users,
    Waypoints,
}

export function getIcon(name: string): LucideIcon {
    return ICONS[name] ?? Circle
}
