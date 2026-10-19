"use client"

import { ArrowRight, Check, FileText, Image as ImageIcon, Paperclip, X } from "lucide-react"
import { useRef, useState, type ChangeEvent, type SubmitEvent } from "react"

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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
    useAutosaveDraft,
    useDraftDocuments,
    useRemoveDocument,
    useSetDeclaredType,
    useUploadDocument,
} from "@/lib/queries/property"
import { DOCUMENT_FILE_ACCEPT } from "@/lib/storage/property-documents"
import { DOCUMENT_SLOT_OPTIONS, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES_BY_SLOT } from "@/lib/types/property"
import { cn } from "@/lib/utils"
import {
    documentSlotSchema,
    propertyDocumentTypeSchema,
    type DocumentSlot,
    type DraftDocument,
    type PropertyDocumentType,
} from "@/lib/validators/property"
import { useNewPropertyStore } from "@/stores/new-property-store"

const NOT_SURE = "I'm not sure"

// What the type picker shows for each value, so the chosen type reads as its name rather than its key
const TYPE_ITEMS = [
    { value: null, label: NOT_SURE },
    ...propertyDocumentTypeSchema.options.map((value) => ({ value, label: DOCUMENT_TYPE_LABELS[value] })),
]

const GROUP_TITLES: Record<DocumentSlot, string> = {
    ownership: "Ownership documents",
    site_plan: "Plans",
    supporting: "Supporting documents",
}

// A file being uploaded, or one that failed, shown under the checklist item it was added to
type Upload = {
    key: number
    slot: DocumentSlot
    fileName: string
    error?: string
}

export default function Documents() {
    const handleNext = useNewPropertyStore((state) => state.handleNext)
    const acquisition = useNewPropertyStore((state) => state.acquisition)
    const documents = useDraftDocuments()
    const { mutateAsync: upload } = useUploadDocument()
    const [uploads, setUploads] = useState<Upload[]>([])
    const nextKey = useRef(0)

    // Removing the document the acquisition answer points to changes that answer, so it is saved like any other change
    useAutosaveDraft([acquisition])

    const linkedDocumentId = acquisition && "document" in acquisition.metadata ? acquisition.metadata.document?.id : undefined
    // Continue waits for uploads, so every file the user chose is on the draft before they move on
    const uploading = uploads.some((each) => !each.error)

    function addFiles(slot: DocumentSlot, files: File[]) {
        for (const file of files) {
            const key = nextKey.current++
            setUploads((current) => [...current, { key, slot, fileName: file.name }])
            // Each file has its own promise, as a mutation's own callbacks only run for the latest of several uploads
            upload({ file, slot }).then(
                () => setUploads((current) => current.filter((each) => each.key !== key)),
                (error: Error) =>
                    setUploads((current) => current.map((each) => (each.key === key ? { ...each, error: error.message } : each))),
            )
        }
    }

    function dismissUpload(key: number) {
        setUploads((current) => current.filter((each) => each.key !== key))
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (uploading) return
        handleNext()
    }

    const hasDocuments = documents.isPending || (documents.data?.length ?? 0) > 0

    return (
        <section className="mx-auto w-full max-w-xl px-5 py-10 md:py-14">
            <h1 className="text-heading text-foreground md:text-2xl">Add your documents</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                Upload what you have for each item below. Photos of paper documents are fine. If you&apos;re not sure
                where something goes, add it anyway: a reviewer checks every document.
            </p>

            <form noValidate onSubmit={handleSubmit} className="mt-8">
                {documents.isError && (
                    <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-card p-3 text-sm text-destructive">
                        <span>{documents.error.message}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => documents.refetch()}>
                            Try again
                        </Button>
                    </div>
                )}

                <ul className="flex flex-col gap-4">
                    {DOCUMENT_SLOT_OPTIONS.map((option) => (
                        <SlotItem
                            key={option.value}
                            option={option}
                            loading={documents.isPending}
                            documents={documents.data?.filter((document) => document.slot === option.value) ?? []}
                            uploads={uploads.filter((each) => each.slot === option.value)}
                            linkedDocumentId={linkedDocumentId}
                            onAdd={(files) => addFiles(option.value, files)}
                            onDismissUpload={dismissUpload}
                        />
                    ))}
                </ul>

                <p className="mt-3 text-xs text-muted-foreground">A PDF, Word document or photo, up to 20 MB each.</p>

                <div className="mt-10 flex justify-end">
                    <Button
                        type="submit"
                        disabled={uploading}
                        className="pressable h-12 w-full rounded-lg bg-secondary px-8 text-[15px] text-secondary-foreground hover:bg-secondary/90 sm:w-auto"
                    >
                        {uploading ? "Uploading…" : hasDocuments ? "Continue" : "Continue without documents"}
                        {!uploading && <ArrowRight size={16} aria-hidden />}
                    </Button>
                </div>
            </form>
        </section>
    )
}

type SlotItemProps = {
    option: (typeof DOCUMENT_SLOT_OPTIONS)[number]
    loading: boolean
    documents: DraftDocument[]
    uploads: Upload[]
    linkedDocumentId: string | undefined
    onAdd: (files: File[]) => void
    onDismissUpload: (key: number) => void
}

// One item on the checklist, with the files added to it and a button to add more
function SlotItem({ option, loading, documents, uploads, linkedDocumentId, onAdd, onDismissUpload }: SlotItemProps) {
    const input = useRef<HTMLInputElement>(null)
    const titleId = `documents-${option.value}-title`
    const done = documents.length > 0

    function handleFiles(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? [])
        // Clear the input so the same file can be chosen again after a failed upload
        event.target.value = ""
        if (files.length) onAdd(files)
    }

    return (
        <li aria-labelledby={titleId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
                <span
                    className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors motion-reduce:transition-none",
                        done ? "bg-primary text-primary-foreground" : "bg-background text-primary",
                    )}
                >
                    {done ? <Check size={18} strokeWidth={2.5} aria-hidden /> : <option.icon size={18} aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                    <h2 id={titleId} className="text-[15px] leading-snug font-semibold text-foreground">
                        {option.title}{" "}
                        <span className="sr-only">{done ? "(added)" : "(not added yet)"}</span>
                    </h2>
                    <p className="mt-0.5 text-sm leading-relaxed text-copy">{option.description}</p>
                </div>
            </div>

            {(documents.length > 0 || uploads.length > 0) && (
                <ul className="mt-4 flex flex-col gap-2">
                    {documents.map((document) => (
                        <li key={document.id}>
                            <DocumentRow document={document} linked={document.id === linkedDocumentId} />
                        </li>
                    ))}
                    {uploads.map((each) => (
                        <li key={each.key}>
                            <UploadRow upload={each} onDismiss={() => onDismissUpload(each.key)} />
                        </li>
                    ))}
                </ul>
            )}

            {loading && (
                <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner aria-hidden /> Loading your documents…
                </p>
            )}

            <input
                ref={input}
                type="file"
                multiple
                accept={DOCUMENT_FILE_ACCEPT}
                onChange={handleFiles}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
            />
            <Button
                type="button"
                variant="outline"
                onClick={() => input.current?.click()}
                aria-describedby={titleId}
                className="pressable mt-4 h-11 gap-2 rounded-lg border-dashed bg-card px-4"
            >
                <Paperclip size={16} aria-hidden />
                {documents.length > 0 ? "Add another file" : "Add a file"}
            </Button>
        </li>
    )
}

type DocumentRowProps = {
    document: DraftDocument
    /** Whether this is the document given in answer to how the user got the property */
    linked: boolean
}

// An uploaded document, with a choice of what it is for users who know
function DocumentRow({ document, linked }: DocumentRowProps) {
    const remove = useRemoveDocument()
    const setDeclaredType = useSetDeclaredType()
    const typeId = `document-${document.id}-type`
    // The kinds of document usual for the checklist item it is under are listed first
    const groups = [document.slot, ...documentSlotSchema.options.filter((other) => other !== document.slot)]
    const error = remove.error?.message ?? setDeclaredType.error?.message

    function chooseType(value: PropertyDocumentType | null) {
        if (value === document.declared_type) return
        setDeclaredType.mutate({ document, declared_type: value })
    }

    return (
        <Attachment className="w-full">
            <AttachmentMedia>{document.mime_type.startsWith("image/") ? <ImageIcon aria-hidden /> : <FileText aria-hidden />}</AttachmentMedia>
            <AttachmentContent>
                <AttachmentTitle>{document.file_name}</AttachmentTitle>
                <AttachmentDescription>
                    {formatSize(document.file_size_bytes)}
                    {linked && " · Added with your answer on how you got the property"}
                </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
                <AttachmentAction
                    onClick={() => remove.mutate(document)}
                    disabled={remove.isPending}
                    aria-label={`Remove ${document.file_name}`}
                >
                    {remove.isPending ? <Spinner aria-hidden /> : <X aria-hidden />}
                </AttachmentAction>
            </AttachmentActions>

            <div className="flex basis-full flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <label htmlFor={typeId} className="shrink-0 text-xs text-muted-foreground">
                    What is it? <span className="sr-only">({document.file_name})</span>
                </label>
                <Select
                    items={TYPE_ITEMS}
                    value={document.declared_type}
                    onValueChange={(value) => chooseType(value as PropertyDocumentType | null)}
                >
                    <SelectTrigger id={typeId} className="h-9 w-full bg-background text-base sm:flex-1 md:text-sm">
                        <SelectValue placeholder={NOT_SURE} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={null}>{NOT_SURE}</SelectItem>
                        {groups.map((group) => (
                            <SelectGroup key={group}>
                                <SelectLabel>{GROUP_TITLES[group]}</SelectLabel>
                                {DOCUMENT_TYPES_BY_SLOT[group].map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {DOCUMENT_TYPE_LABELS[type]}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {error && (
                <p role="alert" className="basis-full text-xs text-destructive">
                    {error}
                </p>
            )}
        </Attachment>
    )
}

type UploadRowProps = {
    upload: Upload
    onDismiss: () => void
}

function UploadRow({ upload, onDismiss }: UploadRowProps) {
    if (upload.error) {
        return (
            <Attachment state="error" className="w-full">
                <AttachmentMedia>
                    <FileText aria-hidden />
                </AttachmentMedia>
                <AttachmentContent>
                    <AttachmentTitle>{upload.fileName}</AttachmentTitle>
                    <AttachmentDescription role="alert" className="whitespace-normal">
                        {upload.error}
                    </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                    <AttachmentAction onClick={onDismiss} aria-label={`Dismiss ${upload.fileName}`}>
                        <X aria-hidden />
                    </AttachmentAction>
                </AttachmentActions>
            </Attachment>
        )
    }

    return (
        <Attachment state="uploading" className="w-full">
            <AttachmentMedia>
                <Spinner aria-hidden />
            </AttachmentMedia>
            <AttachmentContent>
                <AttachmentTitle>{upload.fileName}</AttachmentTitle>
                <AttachmentDescription role="status">Uploading…</AttachmentDescription>
            </AttachmentContent>
        </Attachment>
    )
}

function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
