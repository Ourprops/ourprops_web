import { Building2, Factory, House, LandPlot, LucideIcon, Shapes, Store } from "lucide-react";

import type { PropertyType } from "@/lib/validators/property";

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
