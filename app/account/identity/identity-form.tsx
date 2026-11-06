"use client"

import { BookOpen, CreditCard } from "lucide-react"
import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { countryOptions } from "@/lib/countries"
import { IDENTITY_DOCUMENTS_BUCKET, identityFilePath, identityMimeType } from "@/lib/storage/identity-documents"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { IDENTITY_DOCUMENT_TYPES, identityDocumentSchema } from "@/lib/validators/identity"

import { saveIdentityDocument } from "./actions"
import { GhanaCardInput } from "./ghana-card-input"
import { PhotoPicker } from "./photo-picker"

type DocumentType = keyof typeof IDENTITY_DOCUMENT_TYPES

const CHOICES: { value: DocumentType; title: string; text: string; icon: typeof CreditCard }[] = [
    { value: "ghana_card", title: "Ghana Card", text: "The National Identification Authority card", icon: CreditCard },
    { value: "passport", title: "Passport", text: "If you live abroad and don't have a Ghana Card", icon: BookOpen },
]

const selectClassName =
    "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-72 sm:text-sm"

// The form for adding, or replacing, the owner's identity document. The photo goes straight from the browser to the
// owner's own folder in storage, then the details are saved with its path. If saving fails, the photo is removed,
// so no ID photo is left in storage without a document pointing to it.
export function IdentityForm({ profileId }: { profileId: string }) {
    const [documentType, setDocumentType] = useState<DocumentType>("ghana_card")
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const countries = useMemo(() => countryOptions(), [])

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        const formData = new FormData(event.currentTarget)

        // Check the details before uploading, so a typo doesn't leave the owner waiting on an upload first
        const checked = identityDocumentSchema.safeParse({
            documentType: formData.get("document_type"),
            issuingCountry: formData.get("issuing_country") ?? "",
            documentNumber: formData.get("document_number") ?? "",
            expiresOn: formData.get("expires_on"),
            filePath: file ? "pending" : "",
        })
        if (!checked.success) {
            setError(checked.error.issues[0].message)
            return
        }
        if (!file) return

        startTransition(async () => {
            const mimeType = identityMimeType(file)
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
        <form onSubmit={submit} className="grid gap-6">
            <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Which document will you use?</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                    {CHOICES.map(({ value, title, text, icon: Icon }) => (
                        <label
                            key={value}
                            className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                                documentType === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                            )}
                        >
                            <input
                                type="radio"
                                name="document_type"
                                value={value}
                                checked={documentType === value}
                                onChange={() => setDocumentType(value)}
                                className="sr-only"
                            />
                            <Icon className={cn("mt-0.5 size-5 shrink-0", documentType === value ? "text-primary" : "text-muted-foreground")} aria-hidden />
                            <span className="grid gap-0.5">
                                <span className="font-medium">{title}</span>
                                <span className="text-xs text-muted-foreground">{text}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {documentType === "ghana_card" ? (
                <GhanaCardInput />
            ) : (
                <>
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
                    <div className="grid gap-1.5">
                        <Label htmlFor="document_number">Passport number</Label>
                        <Input
                            id="document_number"
                            name="document_number"
                            required
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            aria-describedby="document_number-hint"
                            className="text-data h-11 text-base tracking-wide uppercase sm:w-72"
                        />
                        <p id="document_number-hint" className="text-xs text-muted-foreground">
                            On the photo page, usually at the top right.
                        </p>
                    </div>
                </>
            )}

            <div className="grid gap-1.5">
                <Label htmlFor="expires_on">Expiry date</Label>
                <Input id="expires_on" name="expires_on" type="date" required className="h-11 w-full text-base sm:w-56 sm:text-sm" />
                <p className="text-xs text-muted-foreground">
                    {documentType === "ghana_card" ? "On the front, under “Date of Expiry”." : "On the photo page, under “Date of expiry”."}
                </p>
            </div>

            <PhotoPicker
                label={documentType === "ghana_card" ? "Photo of the front of your card" : "Photo of your passport's photo page"}
                file={file}
                onChange={setFile}
            />

            <div className="grid gap-3">
                {error ? (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                ) : null}
                <Button type="submit" size="lg" disabled={pending} className="h-11 w-full sm:w-fit sm:px-6">
                    {pending ? <Spinner /> : null}
                    {pending ? "Saving…" : "Save my document"}
                </Button>
            </div>
        </form>
    )
}
