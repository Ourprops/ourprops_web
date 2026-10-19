"use client"

import { ArrowRight, CircleAlert, Pencil, TriangleAlert } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { polygonArea, toAcres } from "@/lib/geo"
import { useDraftDocuments, useSubmitDraft } from "@/lib/queries/property"
import { ACQUISITION_OPTIONS, DOCUMENT_SLOT_OPTIONS, DOCUMENT_TYPE_LABELS, TYPE_OPTIONS } from "@/lib/types/property"
import { cn } from "@/lib/utils"
import {
    SUBMISSION_DECLARATION,
    type AcquisitionDraft,
    type DocumentReference,
    type DraftDocument,
} from "@/lib/validators/property"
import { useNewPropertyStore, type NewPropertyStoreState, type Screen } from "@/stores/new-property-store"

const wholeNumber = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 })
const twoDecimals = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 })

const DECLARATION_ID = "review-declaration"
const DECLARATION_ERROR = "Tick the box to confirm your information is accurate"

// Something left out that a reviewer will want, which the user can still submit without
export type Gap = {
    key: string
    message: string
    screen: Screen
}

// The follow-up answers, read loosely so each method's can be shown without narrowing the union
type Metadata = {
    transferred_by?: { name?: string; phone?: string }
    has_document?: boolean
    document?: DocumentReference
    lease_years?: number
    note?: string
}

export type Answers = Pick<NewPropertyStoreState, "details" | "location" | "boundary" | "acquisition">

// What the database needs before a property can leave draft. The earlier screens ask for these before the user can
// continue, so they are only missing if something went wrong; submitting would be refused, so it waits for them.
function missingRequired({ details, location, acquisition }: Answers): string[] {
    const missing = []
    if (!details.name?.trim()) missing.push("the property's name")
    if (!details.type) missing.push("the type of property")
    if (!location.region) missing.push("the region")
    if (!location.city?.trim()) missing.push("the city or town")
    if (!acquisition) missing.push("how you got the property")
    return missing
}

export function findGaps({ boundary, acquisition }: Answers, documents: DraftDocument[] | undefined): Gap[] {
    const gaps: Gap[] = []
    if (!boundary) gaps.push({ key: "boundary", message: "No boundary or pin on the map yet", screen: "boundary" })

    const metadata = (acquisition?.metadata ?? {}) as Metadata
    if (metadata.has_document && !metadata.document) {
        gaps.push({
            key: "acquisition-document",
            message: "You said you have a document about how you got the property, but it isn't uploaded",
            screen: "acquisition",
        })
    }

    // Until the documents load, nothing is said about them rather than wrongly saying they are missing
    for (const option of DOCUMENT_SLOT_OPTIONS) {
        if (documents && !documents.some((document) => document.slot === option.value)) {
            gaps.push({ key: `documents-${option.value}`, message: `No ${option.title.toLowerCase()} yet`, screen: "documents" })
        }
    }
    return gaps
}

export default function Review() {
    const details = useNewPropertyStore((state) => state.details)
    const location = useNewPropertyStore((state) => state.location)
    const boundary = useNewPropertyStore((state) => state.boundary)
    const acquisition = useNewPropertyStore((state) => state.acquisition)
    const editFromReview = useNewPropertyStore((state) => state.editFromReview)
    const documents = useDraftDocuments()
    const submit = useSubmitDraft()
    const [confirmed, setConfirmed] = useState(false)
    // The declaration's error only shows after the user tries to submit without ticking it
    const [attempted, setAttempted] = useState(false)

    const answers = { details, location, boundary, acquisition }
    const required = missingRequired(answers)
    const gaps = findGaps(answers, documents.data)
    const declarationError = attempted && !confirmed ? DECLARATION_ERROR : undefined

    function handleSubmit() {
        setAttempted(true)
        if (!confirmed) {
            document.getElementById(DECLARATION_ID)?.focus()
            return
        }
        submit.mutate()
    }

    return (
        <section className="mx-auto w-full max-w-xl px-5 py-10 md:py-14">
            <h1 className="text-heading text-foreground md:text-2xl">Check your answers</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                Make sure everything is right before you send the property for review.
            </p>

            {gaps.length > 0 && (
                <div className="mt-6 rounded-xl border border-warning/30 bg-warning-soft p-4">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                        <TriangleAlert size={18} className="shrink-0 text-warning" aria-hidden />
                        {gaps.length === 1 ? "1 thing is missing" : `${gaps.length} things are missing`}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-copy">
                        You can still submit, but a reviewer may ask you for these, which can slow down the review.
                    </p>
                    <ul className="mt-3 flex flex-col gap-1.5">
                        {gaps.map((gap) => (
                            <li key={gap.key}>
                                <button
                                    type="button"
                                    onClick={() => editFromReview(gap.screen)}
                                    className="text-left text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
                                >
                                    {gap.message}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
                <Section title="Property details" screen="details">
                    <Row term="Name" value={details.name} required />
                    <Row term="Type" value={TYPE_OPTIONS.find((option) => option.value === details.type)?.title} required />
                    <Row term="Description" value={details.description} />
                </Section>

                <Section title="Location" screen="location">
                    <Row term="Region" value={location.region} required />
                    <Row term="Municipality or district" value={location.municipality} />
                    <Row term="City or town" value={location.city} required />
                    <Row term="Address" value={location.address} />
                    <Row term="Digital address" value={location.digital_address} />
                    <Row term="Landmark" value={location.landmark} />
                </Section>

                <Section title="Boundary" screen="boundary">
                    {!boundary ? (
                        <Row term="On the map" missing="No boundary or pin yet" />
                    ) : "pin" in boundary ? (
                        <>
                            <Row
                                term="On the map"
                                value={`A pin at ${boundary.pin.latitude.toFixed(6)}, ${boundary.pin.longitude.toFixed(6)}`}
                            />
                            <Row term="Boundary" value="Not drawn. A reviewer will work it out from your documents." />
                        </>
                    ) : (
                        <>
                            <Row term="On the map" value={boundary.source === "geojson_import" ? "Boundary from your file" : "Boundary drawn"} />
                            <Row term="Area" value={formatArea(polygonArea(boundary.polygon))} />
                        </>
                    )}
                </Section>

                <Section title="How you got it" screen="acquisition">
                    <AcquisitionRows acquisition={acquisition} />
                </Section>

                <Section title="Documents" screen="documents">
                    {documents.isPending ? (
                        <p role="status" className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                            <Spinner aria-hidden /> Loading your documents…
                        </p>
                    ) : documents.isError ? (
                        <div role="alert" className="flex items-center justify-between gap-3 py-2 text-sm text-destructive">
                            <span>{documents.error.message}</span>
                            <Button type="button" variant="outline" size="sm" onClick={() => documents.refetch()}>
                                Try again
                            </Button>
                        </div>
                    ) : (
                        DOCUMENT_SLOT_OPTIONS.map((option) => (
                            <DocumentRows
                                key={option.value}
                                term={option.title}
                                documents={documents.data.filter((document) => document.slot === option.value)}
                            />
                        ))
                    )}
                </Section>
            </div>

            <Field data-invalid={!!declarationError} className="mt-8">
                <p id={`${DECLARATION_ID}-statement`} className="text-[15px] leading-relaxed font-medium text-foreground">
                    {SUBMISSION_DECLARATION}
                </p>
                <FieldLabel htmlFor={DECLARATION_ID} className="bg-card">
                    <Field orientation="horizontal" className="items-center gap-3 p-3.5!">
                        <Checkbox
                            id={DECLARATION_ID}
                            checked={confirmed}
                            onCheckedChange={setConfirmed}
                            aria-invalid={!!declarationError}
                            aria-describedby={`${DECLARATION_ID}-statement`}
                        />
                        <FieldContent>
                            <FieldTitle>I confirm</FieldTitle>
                        </FieldContent>
                    </Field>
                </FieldLabel>
                <FieldError errors={declarationError ? [{ message: declarationError }] : undefined} />
            </Field>

            <div className="mt-8 flex flex-col gap-3">
                {required.length > 0 ? (
                    <p role="alert" className="flex gap-2 text-sm text-destructive">
                        <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                        Add {listOf(required)} before you submit.
                    </p>
                ) : (
                    <p className="text-sm leading-relaxed text-copy">
                        Once you submit, your answers and documents are locked while a reviewer checks them.
                    </p>
                )}
                {submit.error && (
                    <p role="alert" className="flex gap-2 text-sm text-destructive">
                        <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                        {submit.error.message}
                    </p>
                )}
                <div className="flex justify-end">
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={required.length > 0 || submit.isPending}
                        className="pressable h-12 w-full rounded-lg bg-secondary px-8 text-[15px] text-secondary-foreground hover:bg-secondary/90 sm:w-auto"
                    >
                        {submit.isPending ? "Submitting…" : "Submit for review"}
                        {!submit.isPending && <ArrowRight size={16} aria-hidden />}
                    </Button>
                </div>
            </div>
        </section>
    )
}

type SectionProps = {
    title: string
    screen: Screen
    children: ReactNode
}

function Section({ title, screen, children }: SectionProps) {
    const editFromReview = useNewPropertyStore((state) => state.editFromReview)
    const id = `review-${screen}`

    return (
        <section aria-labelledby={id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
                <h2 id={id} className="text-[15px] font-semibold text-foreground">
                    {title}
                </h2>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editFromReview(screen)}
                    className="pressable -mr-2 gap-1.5 text-primary"
                >
                    <Pencil size={14} aria-hidden />
                    Edit{" "}<span className="sr-only">{title.toLowerCase()}</span>
                </Button>
            </div>
            <dl className="mt-2 divide-y divide-border">{children}</dl>
        </section>
    )
}

type RowProps = {
    term: string
    value?: ReactNode
    /** Shown as a warning in place of the value: something a reviewer will want */
    missing?: string
    /** Whether the property can't be submitted without it */
    required?: boolean
}

// One answer. An empty optional answer reads "Not given"; an empty required one is marked so the user sees it.
function Row({ term, value, missing, required = false }: RowProps) {
    const empty = value === undefined || value === null || value === ""

    return (
        <div className="grid gap-0.5 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted-foreground">{term}</dt>
            <dd
                className={cn(
                    "min-w-0 text-sm wrap-break-word",
                    !empty && "text-foreground",
                    empty && missing && "flex items-start gap-1.5 font-medium text-warning",
                    empty && !missing && required && "font-medium text-destructive",
                    empty && !missing && !required && "text-muted-foreground",
                )}
            >
                {empty && missing && <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />}
                {!empty ? value : (missing ?? (required ? "Required" : "Not given"))}
            </dd>
        </div>
    )
}

function AcquisitionRows({ acquisition }: { acquisition: AcquisitionDraft }) {
    if (!acquisition) return <Row term="How" required />

    const metadata = acquisition.metadata as Metadata
    const title = ACQUISITION_OPTIONS.find((option) => option.value === acquisition.method)?.title
    const documentRow = (term: string, optional: boolean) => (
        <Row
            term={term}
            value={metadata.document?.file_name}
            missing={optional ? undefined : "Not uploaded yet"}
        />
    )

    switch (acquisition.method) {
        case "direct_purchase":
        case "transfer_assignment":
            return (
                <>
                    <Row term="How" value={title} />
                    {documentRow("Document", true)}
                </>
            )
        case "purchase_from_owner":
            return (
                <>
                    <Row term="How" value={title} />
                    <Row term="Transferred by" value={metadata.transferred_by?.name} />
                    <Row term="Their phone number" value={metadata.transferred_by?.phone} />
                    {metadata.has_document
                        ? documentRow("Transfer document", false)
                        : <Row term="Transfer document" value="You don't have it" />}
                </>
            )
        case "lease_sublease":
            return (
                <>
                    <Row term="How" value={title} />
                    <Row term="Length of lease" value={metadata.lease_years ? `${metadata.lease_years} years` : undefined} />
                </>
            )
        case "inheritance":
            return (
                <>
                    <Row term="How" value={title} />
                    {metadata.has_document
                        ? documentRow("Supporting document", false)
                        : <Row term="Supporting document" value="You don't have one" />}
                </>
            )
        case "other":
            return (
                <>
                    <Row term="How" value={title} />
                    <Row term="What happened" value={metadata.note} />
                </>
            )
        case "unsure":
            return <Row term="How" value="You're not sure. A reviewer will work it out from your documents." />
    }
}

function DocumentRows({ term, documents }: { term: string; documents: DraftDocument[] }) {
    if (documents.length === 0) return <Row term={term} missing="None uploaded yet" />

    return (
        <Row
            term={term}
            value={
                <ul className="flex flex-col gap-1">
                    {documents.map((document) => (
                        <li key={document.id} className="min-w-0">
                            <span className="block truncate">{document.file_name}</span>
                            <span className="text-xs text-muted-foreground">
                                {document.declared_type ? DOCUMENT_TYPE_LABELS[document.declared_type] : "Type not given"}
                            </span>
                        </li>
                    ))}
                </ul>
            }
        />
    )
}

function formatArea(squareMetres: number) {
    return `${wholeNumber.format(squareMetres)} m² (${twoDecimals.format(toAcres(squareMetres))} acres)`
}

// "a, b and c"
function listOf(items: string[]) {
    return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0]
}
