import {
    ArrowLeftRight,
    Building2,
    CircleQuestionMark,
    Factory,
    FilePen,
    HandCoins,
    House,
    KeyRound,
    LandPlot,
    LucideIcon,
    MessageSquareText,
    Shapes,
    Store,
    Users,
} from "lucide-react";

import type { AcquisitionMethod, PropertyType } from "@/lib/validators/property";

type TypeOption = {
    value: PropertyType
    icon: LucideIcon
    title: string
    description: string
}

export const TYPE_OPTIONS: TypeOption[] = [
    { value: "residential", icon: House, title: "Residential", description: "A home, apartment or rental." },
    { value: "commercial", icon: Store, title: "Commercial", description: "Shops, offices or hospitality." },
    { value: "industrial", icon: Factory, title: "Industrial", description: "Factories, warehouses or yards." },
    { value: "land", icon: LandPlot, title: "Land", description: "An undeveloped plot or farmland." },
    { value: "mixed-use", icon: Building2, title: "Mixed use", description: "Homes and businesses together." },
    { value: "other", icon: Shapes, title: "Other", description: "Something that doesn't fit above." },
]

type AcquisitionOption = {
    value: AcquisitionMethod
    icon: LucideIcon
    title: string
}

// In the order the acquisition question lists them, with "I'm not sure" last
export const ACQUISITION_OPTIONS: AcquisitionOption[] = [
    { value: "direct_purchase", icon: HandCoins, title: "I bought it directly from the original owner or family" },
    { value: "purchase_from_owner", icon: ArrowLeftRight, title: "I bought it from another owner" },
    { value: "transfer_assignment", icon: FilePen, title: "It was transferred or assigned to me" },
    { value: "lease_sublease", icon: KeyRound, title: "It was leased or subleased to me" },
    { value: "inheritance", icon: Users, title: "I inherited it" },
    { value: "other", icon: MessageSquareText, title: "Other" },
    { value: "unsure", icon: CircleQuestionMark, title: "I'm not sure" },
]
