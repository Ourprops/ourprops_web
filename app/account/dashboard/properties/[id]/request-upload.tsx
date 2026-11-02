"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { DOCUMENT_FILE_ACCEPT, PROPERTY_DOCUMENTS_BUCKET, documentMimeType } from "@/lib/storage/property-documents"
import { createClient } from "@/lib/supabase/client"
import { documentReferenceSchema, documentUploadSchema, type DocumentSlot } from "@/lib/validators/property"

type Props = {
    propertyId: string
    slot: DocumentSlot
    // What the owner has already uploaded for this item since it was asked for
    uploads: { id: string; file_name: string }[]
}

// Uploads into one requested checklist item, the same way registration does: the document is recorded through the
// API, which says where to put the file, and the file goes straight to storage. The database only accepts it
// while a request for this item is open (answers_open_request).
export function RequestUpload({ propertyId, slot, uploads }: Props) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function upload(file: File) {
        setError(null)
        const details = documentUploadSchema.safeParse({
            slot,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: documentMimeType(file),
        })
        if (!details.success) {
            setError(details.error.issues[0]?.message ?? "This file can't be uploaded.")
            return
        }

        setBusy(true)
        try {
            const response = await fetch(`/api/property/draft/${propertyId}/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(details.data),
            })
            if (!response.ok) {
                setError("This item isn't open for uploads. Reload the page to see what's still asked for.")
                return
            }
            const document = documentReferenceSchema.parse(await response.json())

            const { error: storageError } = await createClient()
                .storage.from(PROPERTY_DOCUMENTS_BUCKET)
                .upload(document.path, file, { contentType: details.data.mime_type, upsert: false })
            if (storageError) {
                // Don't leave a record of a file that never arrived
                await fetch(`/api/property/draft/${propertyId}/documents/${document.id}`, { method: "DELETE" }).catch(() => {})
                setError("The file didn't upload. Check your connection and try again.")
                return
            }

            router.refresh()
        } catch {
            setError("The file didn't upload. Check your connection and try again.")
        } finally {
            setBusy(false)
        }
    }

    async function remove(documentId: string) {
        setError(null)
        setBusy(true)
        try {
            const response = await fetch(`/api/property/draft/${propertyId}/documents/${documentId}`, { method: "DELETE" })
            if (!response.ok) setError("That file can't be removed now.")
            router.refresh()
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="grid gap-2">
            {uploads.length > 0 ? (
                <ul className="grid gap-1 text-sm">
                    {uploads.map((document) => (
                        <li key={document.id} className="flex flex-wrap items-center gap-2">
                            <span className="break-all">{document.file_name}</span>
                            <Button type="button" size="xs" variant="ghost" disabled={busy} onClick={() => remove(document.id)}>
                                Remove
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-primary">
                {busy ? <Spinner /> : null}
                {uploads.length > 0 ? "Upload another file" : "Upload a file"}
                <input
                    type="file"
                    accept={DOCUMENT_FILE_ACCEPT}
                    disabled={busy}
                    className="sr-only"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        event.target.value = ""
                        if (file) void upload(file)
                    }}
                />
            </label>
            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    )
}
