"use client"

import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { countryOptions } from "@/lib/countries"
import {
    IDENTITY_DOCUMENTS_BUCKET,
    IDENTITY_FILE_ACCEPT,
    IDENTITY_MIME_TYPES,
    MAX_IDENTITY_FILE_BYTES,
    identityFilePath,
    identityMimeType,
} from "@/lib/storage/identity-documents"
import { createClient } from "@/lib/supabase/client"
import { IDENTITY_DOCUMENT_TYPES, identityDocumentSchema } from "@/lib/validators/identity"

import { saveIdentityDocument } from "./actions"

type DocumentType = keyof typeof IDENTITY_DOCUMENT_TYPES

const selectClassName =
    "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

// The form for adding, or replacing, the owner's identity document. The photo goes straight from the browser to the
// owner's own folder in storage, then the details are saved with its path. If saving fails, the photo is removed,
// so no ID photo is left in storage without a document pointing to it.
export function IdentityForm({ profileId }: { profileId: string }) {
    const [documentType, setDocumentType] = useState<DocumentType>("ghana_card")
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const countries = useMemo(() => countryOptions(), [])

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        const formData = new FormData(event.currentTarget)
        const file = formData.get("file")
        formData.delete("file")

        if (!(file instanceof File) || file.size === 0) {
            setError("Upload a photo or scan of the document.")
            return
        }
        const mimeType = identityMimeType(file)
        if (!(IDENTITY_MIME_TYPES as readonly string[]).includes(mimeType)) {
            setError("Upload a photo (JPEG, PNG or WebP) or a PDF.")
            return
        }
        if (file.size > MAX_IDENTITY_FILE_BYTES) {
            setError("The file is larger than 10 MB. Take the photo again at a smaller size.")
            return
        }

        // Check the details before uploading, so a typo doesn't leave the owner waiting on an upload first
        const checked = identityDocumentSchema.safeParse({
            documentType: formData.get("document_type"),
            issuingCountry: formData.get("issuing_country") ?? "",
            documentNumber: formData.get("document_number") ?? "",
            expiresOn: formData.get("expires_on"),
            filePath: "pending",
        })
        if (!checked.success) {
            setError(checked.error.issues[0].message)
            return
        }

        startTransition(async () => {
            const storage = createClient().storage.from(IDENTITY_DOCUMENTS_BUCKET)
            const path = identityFilePath(profileId, mimeType)

            const { error: uploadError } = await storage.upload(path, file, { contentType: mimeType, upsert: false })
            if (uploadError) {
                setError("The photo didn't upload. Check your connection and try again.")
                return
            }

            formData.set("file_path", path)
            const result = await saveIdentityDocument(formData)
            if (result?.error) {
                await storage.remove([path]).catch(() => {})
                setError(result.error)
            }
        })
    }

    return (
        <form onSubmit={submit} className="grid gap-5">
            <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">Your document</legend>
                {Object.entries(IDENTITY_DOCUMENT_TYPES).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="document_type"
                            value={value}
                            checked={documentType === value}
                            onChange={() => setDocumentType(value as DocumentType)}
                        />
                        {label}
                    </label>
                ))}
            </fieldset>

            {documentType === "passport" ? (
                <div className="grid gap-1.5">
                    <Label htmlFor="issuing_country">Country that issued it</Label>
                    <select id="issuing_country" name="issuing_country" defaultValue="GH" className={selectClassName}>
                        {countries.map(([code, name]) => (
                            <option key={code} value={code}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
            ) : null}

            <div className="grid gap-1.5">
                <Label htmlFor="document_number">{documentType === "ghana_card" ? "Card number" : "Passport number"}</Label>
                <Input
                    id="document_number"
                    name="document_number"
                    required
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder={documentType === "ghana_card" ? "GHA-123456789-0" : undefined}
                />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="expires_on">Expiry date</Label>
                <Input id="expires_on" name="expires_on" type="date" required className="w-full sm:w-56" />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="file">{documentType === "ghana_card" ? "Photo of the front of the card" : "Photo of the passport's photo page"}</Label>
                <input id="file" name="file" type="file" required accept={IDENTITY_FILE_ACCEPT} className="text-sm" />
                <p className="text-xs text-muted-foreground">
                    Lay it flat in good light, with all four corners showing and the text readable. A photo or a PDF, up to 10 MB.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={pending}>
                    {pending ? <Spinner /> : null}
                    Save
                </Button>
                {error ? (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                ) : null}
            </div>
        </form>
    )
}
