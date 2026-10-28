"use client"

import { ArrowRight, FileText, Paperclip, X } from "lucide-react"
import { Fragment, useRef, useState, type ChangeEvent, type ReactNode, type SubmitEvent } from "react"

import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useAutosaveDraft, useRemoveDocument, useUploadDocument } from "@/lib/queries/property"
import { DOCUMENT_FILE_ACCEPT } from "@/lib/storage/property-documents"
import { ACQUISITION_OPTIONS } from "@/lib/types/property"
import {
    acquisitionSchema,
    type AcquisitionDraft,
    type AcquisitionMethod,
    type DocumentReference,
} from "@/lib/validators/property"
import { useNewPropertyStore } from "@/stores/new-property-store"

import BackButton from "./back-button"

// Field ids in the order they appear, keyed by the path of the answer they hold, used to focus the first one to fix
const FIELD_IDS: Record<string, string> = {
    method: `acquisition-method-${ACQUISITION_OPTIONS[0].value}`,
    "metadata.transferred_by.name": "acquisition-transferred-by-name",
    "metadata.transferred_by.phone": "acquisition-transferred-by-phone",
    "metadata.has_document": "acquisition-has-document-yes",
    "metadata.document": "acquisition-document",
    "metadata.lease_years": "acquisition-lease-years",
    "metadata.note": "acquisition-note",
}

// The follow-up answers, read loosely so each method's fields can be shown without narrowing the union
type Metadata = {
    transferred_by?: { name?: string; phone?: string }
    has_document?: boolean
    document?: DocumentReference
    lease_years?: number
    note?: string
}

type Errors = Partial<Record<string, string>>

// Missing follow-ups are filled in as empty, so the errors say what to enter rather than that a value is missing
function forChecking(acquisition: NonNullable<AcquisitionDraft>) {
    const metadata = acquisition.metadata as Metadata
    if (acquisition.method === "purchase_from_owner") {
        return {
            ...acquisition,
            metadata: {
                ...metadata,
                transferred_by: { name: metadata.transferred_by?.name ?? "", phone: metadata.transferred_by?.phone ?? "" },
            },
        }
    }
    if (acquisition.method === "other") return { ...acquisition, metadata: { note: metadata.note ?? "" } }
    return acquisition
}

function errorsFor(acquisition: AcquisitionDraft): Errors {
    if (!acquisition) return { method: "Choose how you got the property" }
    const result = acquisitionSchema.safeParse(forChecking(acquisition))
    if (result.success) return {}

    const errors: Errors = {}
    for (const issue of result.error.issues) errors[issue.path.join(".")] ??= issue.message
    return errors
}

// Reads the store when called, so an upload that finishes after other edits doesn't undo them
function updateMetadata(patch: Metadata) {
    const { acquisition, setAcquisition } = useNewPropertyStore.getState()
    if (!acquisition) return
    setAcquisition({ ...acquisition, metadata: { ...acquisition.metadata, ...patch } } as AcquisitionDraft)
}

export default function Acquisition() {
    const acquisition = useNewPropertyStore((state) => state.acquisition)
    const setAcquisition = useNewPropertyStore((state) => state.setAcquisition)
    const handleNext = useNewPropertyStore((state) => state.handleNext)

    // Errors only show after the first attempt to continue, then update as the user fixes them
    const [submitted, setSubmitted] = useState(false)
    // Continue waits for an upload, so the document is part of the answer
    const [uploading, setUploading] = useState(false)
    // Switching method keeps the answers given for the others, so switching back restores them
    const kept = useRef<Partial<Record<AcquisitionMethod, NonNullable<AcquisitionDraft>>>>(
        acquisition ? { [acquisition.method]: acquisition } : {},
    )

    useAutosaveDraft([acquisition])

    const errors = submitted ? errorsFor(acquisition) : {}

    function chooseMethod(method: AcquisitionMethod) {
        if (acquisition) kept.current[acquisition.method] = acquisition
        setAcquisition(kept.current[method] ?? ({ method, metadata: {} } as AcquisitionDraft))
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitted(true)

        const found = errorsFor(acquisition)
        const first = Object.keys(FIELD_IDS).find((path) => found[path])
        if (first || !acquisition) {
            if (first) document.getElementById(FIELD_IDS[first])?.focus()
            return
        }

        // Store the trimmed answers; any unsaved change is saved as the screen closes
        const result = acquisitionSchema.safeParse(forChecking(acquisition))
        if (result.success) setAcquisition(result.data)
        handleNext()
    }

    const followUps = acquisition && (
        <FollowUps
            // A fresh set of fields for each method, so one method's upload state doesn't carry over
            key={acquisition.method}
            method={acquisition.method}
            metadata={acquisition.metadata as Metadata}
            errors={errors}
            onUploadingChange={setUploading}
        />
    )

    return (
        <section className="mx-auto w-full max-w-xl px-5 py-10 md:py-14">
            <h1 className="text-heading text-foreground md:text-2xl">How did you get the property?</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                This tells reviewers which documents to look for. If you&apos;re not sure, say so and a reviewer will
                work it out.
            </p>

            <form noValidate onSubmit={handleSubmit} className="mt-8">
                <FieldGroup className="gap-8">
                    <FieldSet data-invalid={!!errors.method}>
                        <FieldLegend className="sr-only">How you got the property</FieldLegend>
                        <RadioGroup
                            value={acquisition?.method ?? null}
                            onValueChange={(value) => chooseMethod(value as AcquisitionMethod)}
                            aria-invalid={!!errors.method}
                            className="gap-3"
                        >
                            {ACQUISITION_OPTIONS.map((option) => (
                                <Fragment key={option.value}>
                                    <FieldLabel
                                        htmlFor={`acquisition-method-${option.value}`}
                                        className="bg-card"
                                    >
                                        <Field orientation="horizontal" className="items-center gap-3 p-3.5!">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
                                                <option.icon size={18} aria-hidden />
                                            </span>
                                            <FieldContent>
                                                <FieldTitle className="leading-snug">{option.title}</FieldTitle>
                                            </FieldContent>
                                            <RadioGroupItem
                                                id={`acquisition-method-${option.value}`}
                                                value={option.value}
                                                aria-invalid={!!errors.method}
                                            />
                                        </Field>
                                    </FieldLabel>
                                    {/* The questions for an answer sit right under it, indented so it's clear they belong to it */}
                                    {acquisition?.method === option.value && (
                                        <FieldGroup
                                            // Keeps arrow keys in these fields working as normal, rather than switching
                                            // the answer above, as they sit inside its radio group
                                            onKeyDown={(event) => event.stopPropagation()}
                                            className="mb-3 ml-4 gap-8 border-l-2 border-primary/30 py-1 pl-4"
                                        >
                                            {followUps}
                                        </FieldGroup>
                                    )}
                                </Fragment>
                            ))}
                        </RadioGroup>
                        <FieldError errors={errors.method ? [{ message: errors.method }] : undefined} />
                    </FieldSet>
                </FieldGroup>

                <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <BackButton disabled={uploading} />
                    <Button
                        type="submit"
                        disabled={uploading}
                        className="pressable h-12 w-full rounded-lg bg-secondary px-8 text-[15px] text-secondary-foreground hover:bg-secondary/90 sm:w-auto"
                    >
                        {uploading ? "Uploading…" : "Continue"}
                        {!uploading && <ArrowRight size={16} aria-hidden />}
                    </Button>
                </div>
            </form>
        </section>
    )
}

type FollowUpsProps = {
    method: AcquisitionMethod
    metadata: Metadata
    errors: Errors
    onUploadingChange: (uploading: boolean) => void
}

// The questions that follow the method the user chose
function FollowUps({ method, metadata, errors, onUploadingChange }: FollowUpsProps) {
    const documentField = (label: string, description: string, optional: boolean) => (
        <DocumentField
            label={label}
            description={description}
            optional={optional}
            document={metadata.document}
            error={errors["metadata.document"]}
            onChange={(document) => updateMetadata({ document })}
            onUploadingChange={onUploadingChange}
        />
    )

    switch (method) {
        case "direct_purchase":
            return documentField(
                "The document showing you bought it",
                "For example, an indenture or a receipt from the family. You can add more documents in the next step.",
                true,
            )

        case "purchase_from_owner":
            return (
                <>
                    <FieldSet>
                        <FieldLegend variant="label">Who transferred the property to you?</FieldLegend>
                        <FieldDescription>A reviewer may contact them to confirm the sale.</FieldDescription>
                        <FieldGroup className="mt-1 gap-5">
                            <Field data-invalid={!!errors["metadata.transferred_by.name"]}>
                                <FieldLabel htmlFor={FIELD_IDS["metadata.transferred_by.name"]}>Their full name</FieldLabel>
                                <Input
                                    id={FIELD_IDS["metadata.transferred_by.name"]}
                                    value={metadata.transferred_by?.name ?? ""}
                                    onChange={(event) =>
                                        updateMetadata({ transferred_by: { ...metadata.transferred_by, name: event.target.value } })
                                    }
                                    placeholder="For example, Kwame Mensah"
                                    autoComplete="off"
                                    aria-invalid={!!errors["metadata.transferred_by.name"]}
                                    className="h-11 bg-card"
                                />
                                <FieldError errors={toErrors(errors["metadata.transferred_by.name"])} />
                            </Field>
                            <Field data-invalid={!!errors["metadata.transferred_by.phone"]}>
                                <FieldLabel htmlFor={FIELD_IDS["metadata.transferred_by.phone"]}>Their phone number</FieldLabel>
                                <Input
                                    id={FIELD_IDS["metadata.transferred_by.phone"]}
                                    type="tel"
                                    inputMode="tel"
                                    value={metadata.transferred_by?.phone ?? ""}
                                    onChange={(event) =>
                                        updateMetadata({ transferred_by: { ...metadata.transferred_by, phone: event.target.value } })
                                    }
                                    placeholder="For example, 024 123 4567"
                                    autoComplete="off"
                                    aria-invalid={!!errors["metadata.transferred_by.phone"]}
                                    className="h-11 bg-card"
                                />
                                <FieldError errors={toErrors(errors["metadata.transferred_by.phone"])} />
                            </Field>
                        </FieldGroup>
                    </FieldSet>

                    <YesNo
                        legend="Do you have the document showing the transfer?"
                        value={metadata.has_document}
                        error={errors["metadata.has_document"]}
                        // Saying No drops the upload from this answer; the document stays on the draft for the next step
                        onChange={(has_document) => updateMetadata(has_document ? { has_document } : { has_document, document: undefined })}
                    />
                    {metadata.has_document &&
                        documentField(
                            "The document showing the transfer",
                            "For example, a deed of assignment or a sale agreement.",
                            false,
                        )}
                </>
            )

        case "transfer_assignment":
            return documentField(
                "The transfer or assignment document",
                "For example, a deed of assignment or a letter of transfer. You can add more documents in the next step.",
                true,
            )

        case "lease_sublease":
            return (
                <Field data-invalid={!!errors["metadata.lease_years"]}>
                    <FieldLabel htmlFor={FIELD_IDS["metadata.lease_years"]}>How long is the lease?</FieldLabel>
                    <div className="flex items-center gap-3">
                        <Input
                            id={FIELD_IDS["metadata.lease_years"]}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={999}
                            value={metadata.lease_years ?? ""}
                            onChange={(event) =>
                                updateMetadata({ lease_years: event.target.value === "" ? undefined : Number(event.target.value) })
                            }
                            placeholder="99"
                            aria-invalid={!!errors["metadata.lease_years"]}
                            aria-describedby="acquisition-lease-years-description"
                            className="h-11 w-28 bg-card"
                        />
                        <span className="text-sm text-copy">years</span>
                    </div>
                    <FieldDescription id="acquisition-lease-years-description">
                        The full length on the lease, for example 50 or 99 years.
                    </FieldDescription>
                    <FieldError errors={toErrors(errors["metadata.lease_years"])} />
                </Field>
            )

        case "inheritance":
            return (
                <>
                    <YesNo
                        legend="Do you have documents supporting the inheritance?"
                        description="For example, letters of administration, a grant of probate or a will."
                        value={metadata.has_document}
                        error={errors["metadata.has_document"]}
                        onChange={(has_document) => updateMetadata(has_document ? { has_document } : { has_document, document: undefined })}
                    />
                    {metadata.has_document &&
                        documentField(
                            "A document supporting the inheritance",
                            "Upload the main one here. You can add more in the next step.",
                            false,
                        )}
                </>
            )

        case "other":
            return (
                <Field data-invalid={!!errors["metadata.note"]}>
                    <FieldLabel htmlFor={FIELD_IDS["metadata.note"]}>Tell us how you got the property</FieldLabel>
                    <Textarea
                        id={FIELD_IDS["metadata.note"]}
                        value={metadata.note ?? ""}
                        onChange={(event) => updateMetadata({ note: event.target.value })}
                        placeholder="For example, it was given to me as a gift by my uncle."
                        aria-invalid={!!errors["metadata.note"]}
                        className="min-h-28 bg-card"
                    />
                    <FieldError errors={toErrors(errors["metadata.note"])} />
                </Field>
            )

        case "unsure":
            return (
                <p className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-copy">
                    That&apos;s fine. Add the documents you have in the next step, and a reviewer will work out how the
                    property was acquired.
                </p>
            )
    }
}

function toErrors(message: string | undefined) {
    return message ? [{ message }] : undefined
}

type YesNoProps = {
    legend: string
    description?: ReactNode
    value: boolean | undefined
    error: string | undefined
    onChange: (value: boolean) => void
}

function YesNo({ legend, description, value, error, onChange }: YesNoProps) {
    return (
        <FieldSet data-invalid={!!error}>
            <FieldLegend variant="label">{legend}</FieldLegend>
            {description && <FieldDescription>{description}</FieldDescription>}
            <RadioGroup
                value={value === undefined ? null : value ? "yes" : "no"}
                onValueChange={(next) => onChange(next === "yes")}
                aria-invalid={!!error}
                className="grid-cols-2 gap-3"
            >
                {(["yes", "no"] as const).map((option) => (
                    <FieldLabel key={option} htmlFor={`acquisition-has-document-${option}`} className="bg-card">
                        <Field orientation="horizontal" className="items-center gap-3 p-3.5!">
                            <FieldContent>
                                <FieldTitle>{option === "yes" ? "Yes" : "No"}</FieldTitle>
                            </FieldContent>
                            <RadioGroupItem id={`acquisition-has-document-${option}`} value={option} aria-invalid={!!error} />
                        </Field>
                    </FieldLabel>
                ))}
            </RadioGroup>
            <FieldError errors={toErrors(error)} />
        </FieldSet>
    )
}

type DocumentFieldProps = {
    label: string
    description: string
    optional: boolean
    document: DocumentReference | undefined
    error: string | undefined
    onChange: (document: DocumentReference | undefined) => void
    onUploadingChange: (uploading: boolean) => void
}

// Uploads the file as soon as it is chosen, so it is kept with the draft
function DocumentField({ label, description, optional, document, error, onChange, onUploadingChange }: DocumentFieldProps) {
    const upload = useUploadDocument()
    const remove = useRemoveDocument()
    const input = useRef<HTMLInputElement>(null)
    const [pending, setPending] = useState<string | null>(null)
    const [failure, setFailure] = useState<string | null>(null)
    const id = FIELD_IDS["metadata.document"]

    function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        // Clear the input so the same file can be chosen again after a failed upload
        event.target.value = ""
        if (!file) return

        setFailure(null)
        setPending(file.name)
        onUploadingChange(true)
        // Every document asked for here shows how the user got the property, so it is listed as an ownership document
        upload.mutate({ file, slot: "ownership" }, {
            onSuccess: (uploaded) => onChange(uploaded),
            onError: (uploadError) => setFailure(uploadError.message),
            onSettled: () => {
                setPending(null)
                onUploadingChange(false)
            },
        })
    }

    function handleRemove() {
        if (!document) return
        setFailure(null)
        remove.mutate(document, {
            onSuccess: () => onChange(undefined),
            onError: (removeError) => setFailure(removeError.message),
        })
    }

    const message = failure ?? error

    return (
        <Field data-invalid={!!message}>
            <FieldLabel htmlFor={id}>
                {label} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
            </FieldLabel>
            <FieldDescription>{description}</FieldDescription>

            <input
                ref={input}
                type="file"
                accept={DOCUMENT_FILE_ACCEPT}
                onChange={handleFile}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
            />

            {document ? (
                <Attachment className="w-full">
                    <AttachmentMedia>
                        <FileText aria-hidden />
                    </AttachmentMedia>
                    <AttachmentContent>
                        <AttachmentTitle>{document.file_name}</AttachmentTitle>
                        <AttachmentDescription>Uploaded</AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                        <AttachmentAction
                            id={id}
                            onClick={handleRemove}
                            disabled={remove.isPending}
                            aria-label={`Remove ${document.file_name}`}
                        >
                            {remove.isPending ? <Spinner aria-hidden /> : <X aria-hidden />}
                        </AttachmentAction>
                    </AttachmentActions>
                </Attachment>
            ) : pending ? (
                <Attachment state="uploading" className="w-full">
                    <AttachmentMedia>
                        <Spinner aria-hidden />
                    </AttachmentMedia>
                    <AttachmentContent>
                        <AttachmentTitle>{pending}</AttachmentTitle>
                        <AttachmentDescription role="status">Uploading…</AttachmentDescription>
                    </AttachmentContent>
                </Attachment>
            ) : (
                <div className="flex flex-col items-start gap-1.5">
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        onClick={() => input.current?.click()}
                        aria-invalid={!!message}
                        className="pressable h-11 gap-2 rounded-lg border-dashed bg-card px-4"
                    >
                        <Paperclip size={16} aria-hidden />
                        Choose a file
                    </Button>
                    <span className="text-xs text-muted-foreground">A PDF, Word document or photo, up to 20 MB</span>
                </div>
            )}

            <FieldError errors={toErrors(message)} />
        </Field>
    )
}
