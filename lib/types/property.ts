import {
    ArrowLeftRight,
    Building2,
    CircleQuestionMark,
    Factory,
    FilePen,
    HandCoins,
    Files,
    House,
    KeyRound,
    LandPlot,
    LucideIcon,
    MapIcon,
    MessageSquareText,
    ScrollText,
    Shapes,
    Store,
    Users,
} from "lucide-react";

import type { AcquisitionMethod, DocumentSlot, PropertyDocumentType, PropertyType } from "@/lib/validators/property";

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

type DocumentSlotOption = {
    value: DocumentSlot
    icon: LucideIcon
    title: string
    description: string
}

// The documents screen's checklist, in order
export const DOCUMENT_SLOT_OPTIONS: DocumentSlotOption[] = [
    {
        value: "ownership",
        icon: ScrollText,
        title: "Ownership document",
        description: "What shows the property is yours, such as an indenture, a land title certificate or a deed of assignment.",
    },
    {
        value: "site_plan",
        icon: MapIcon,
        title: "Site plan or survey plan",
        description: "A plan of the land drawn by a licensed surveyor, ideally with the Lands Commission barcode.",
    },
    {
        value: "supporting",
        icon: Files,
        title: "Other supporting documents",
        description: "Anything else that backs up your claim, such as receipts, a land search report or letters of administration.",
    },
]

/** What each kind of document is called, for the user to say what they uploaded */
export const DOCUMENT_TYPE_LABELS: Record<PropertyDocumentType, string> = {
    land_title_certificate: "Land title certificate",
    indenture: "Indenture",
    deed_of_conveyance: "Deed of conveyance",
    deed_of_assignment: "Deed of assignment",
    lease_agreement: "Lease agreement",
    sublease_agreement: "Sublease agreement",
    head_lease: "Head lease",
    sale_and_purchase_agreement: "Sale and purchase agreement",
    allocation_letter: "Allocation letter",
    site_plan: "Site plan",
    cadastral_plan: "Cadastral plan",
    subdivision_approval: "Subdivision approval",
    previous_owner_acquisition_document: "Previous owner's acquisition document",
    consent_to_assign: "Consent to assign",
    grant_of_probate: "Grant of probate",
    letters_of_administration: "Letters of administration",
    will: "Will",
    power_of_attorney: "Power of attorney",
    official_land_search_report: "Official land search report",
    ground_rent_receipts: "Ground rent receipts",
    property_rate_receipts: "Property rate receipts",
    utility_bills: "Utility bills",
    court_order: "Court order or judgment",
    grantor_authority_documents: "Grantor's authority documents",
}

/** The kinds of document usually found under each checklist item, to group the choices */
export const DOCUMENT_TYPES_BY_SLOT: Record<DocumentSlot, PropertyDocumentType[]> = {
    ownership: [
        "land_title_certificate",
        "indenture",
        "deed_of_conveyance",
        "deed_of_assignment",
        "lease_agreement",
        "sublease_agreement",
        "head_lease",
        "sale_and_purchase_agreement",
        "allocation_letter",
    ],
    site_plan: ["site_plan", "cadastral_plan", "subdivision_approval"],
    supporting: [
        "previous_owner_acquisition_document",
        "consent_to_assign",
        "grant_of_probate",
        "letters_of_administration",
        "will",
        "power_of_attorney",
        "official_land_search_report",
        "ground_rent_receipts",
        "property_rate_receipts",
        "utility_bills",
        "court_order",
        "grantor_authority_documents",
    ],
}
