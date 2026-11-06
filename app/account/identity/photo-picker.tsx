"use client"

import { Camera, FileText, X } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { IDENTITY_FILE_ACCEPT, IDENTITY_MIME_TYPES, MAX_IDENTITY_FILE_BYTES, identityMimeType } from "@/lib/storage/identity-documents"

type Props = {
    label: string
    file: File | null
    onChange: (file: File | null) => void
}

/** Why a file can't be used, checked as soon as it is picked, or null if it can */
export function identityFileProblem(file: File): string | null {
    if (!(IDENTITY_MIME_TYPES as readonly string[]).includes(identityMimeType(file))) {
        return "Choose a photo (JPEG, PNG or WebP) or a PDF."
    }
    if (file.size > MAX_IDENTITY_FILE_BYTES) {
        return "This file is larger than 10 MB. Take the photo again, or choose a smaller copy."
    }
    return null
}

function fileSize(bytes: number) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Picking the document's photo: a large target that opens the camera or the gallery on a phone, then a preview of
// what was picked, so the owner can check it is readable before saving, and Remove to start again.
// Nothing is uploaded here; the form uploads the file when it is saved.
export function PhotoPicker({ label, file, onChange }: Props) {
    const inputId = useId()
    const input = useRef<HTMLInputElement>(null)
    const [problem, setProblem] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // A local preview of an image, made when it is picked and released when it is replaced, removed or the page goes
    const preview = useRef<string | null>(null)
    function showPreview(picked: File | null) {
        if (preview.current) URL.revokeObjectURL(preview.current)
        preview.current = picked && identityMimeType(picked) !== "application/pdf" ? URL.createObjectURL(picked) : null
        setPreviewUrl(preview.current)
    }
    useEffect(() => () => {
        if (preview.current) URL.revokeObjectURL(preview.current)
    }, [])

    function pick(picked: File | undefined) {
        if (!picked) return
        const found = identityFileProblem(picked)
        setProblem(found)
        showPreview(found ? null : picked)
        onChange(found ? null : picked)
    }

    function remove() {
        setProblem(null)
        showPreview(null)
        onChange(null)
        if (input.current) input.current.value = ""
    }

    return (
        <div className="grid gap-1.5">
            <span id={`${inputId}-label`} className="text-sm font-medium">
                {label}
            </span>
            <input
                ref={input}
                id={inputId}
                type="file"
                accept={IDENTITY_FILE_ACCEPT}
                className="peer sr-only"
                aria-labelledby={`${inputId}-label`}
                aria-describedby={`${inputId}-hint`}
                onChange={(event) => pick(event.target.files?.[0])}
            />

            {file ? (
                <div className="grid gap-3 rounded-xl border border-border p-3">
                    {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a local preview of the owner's own file, never uploaded as is
                        <img
                            src={previewUrl}
                            alt="The photo you picked"
                            className="max-h-72 w-full rounded-lg bg-muted object-contain"
                        />
                    ) : (
                        <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                            <FileText className="size-8 text-muted-foreground" aria-hidden />
                            <span className="text-sm">PDF ready to send</span>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 text-xs text-muted-foreground wrap-anywhere">
                            {file.name} · {fileSize(file.size)}
                        </span>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
                                Choose another
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={remove}>
                                <X aria-hidden /> Remove
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={inputId}
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary hover:bg-muted/50 peer-focus-visible:border-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
                >
                    <Camera className="size-8 text-primary" aria-hidden />
                    <span className="font-medium text-primary">Take or choose a photo</span>
                    <span className="text-xs text-muted-foreground">A photo or a PDF, up to 10 MB</span>
                </label>
            )}

            <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                Lay it flat in good light, with all four corners showing and the writing sharp enough to read.
            </p>
            {problem ? (
                <p role="alert" className="text-sm text-destructive">
                    {problem}
                </p>
            ) : null}
        </div>
    )
}
