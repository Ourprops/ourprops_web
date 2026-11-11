"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import type { DocumentView } from "@/lib/admin/document-preview"

type Props = {
    fileName: string
    // Under the title; says how the file is shown
    description?: string
    // openPropertyDocument with the document's id bound by the page
    open: () => Promise<DocumentView>
}

// Opens one document in a side panel. The first open of a Word or TIFF file converts it, which can take a while on a
// cold converter, so the panel says so. The URL is signed for a few minutes, so each open asks for a new one.
export function DocumentViewer({
    fileName,
    description = "Shown as a PDF or an image. Word files and scans are converted first; the original is never opened.",
    open,
}: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [view, setView] = useState<DocumentView | null>(null)
    const [pending, startTransition] = useTransition()

    function load() {
        setView(null)
        startTransition(async () => setView(await open()))
    }

    function onOpenChange(next: boolean) {
        setIsOpen(next)
        if (next) load()
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            {/* The button's base classes don't let it shrink or wrap; a long file name would push the row wider than the
                page. Here it shrinks, wraps anywhere, and stops at two lines: the panel's title has the whole name. */}
            <Button
                type="button"
                variant="link"
                title={fileName}
                className="h-auto max-w-full min-w-0 shrink justify-start p-0 text-left whitespace-normal"
                onClick={() => onOpenChange(true)}
            >
                <span className="line-clamp-2 wrap-anywhere">{fileName}</span>
            </Button>
            <SheetContent side="right" className="w-full data-[side=right]:sm:max-w-4xl">
                <SheetHeader>
                    <SheetTitle className="pr-8 wrap-anywhere">{fileName}</SheetTitle>
                    <SheetDescription>{description}</SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
                    {pending || !view ? (
                        <p className="flex items-center gap-2 text-muted-foreground">
                            <Spinner /> Preparing document…
                        </p>
                    ) : "error" in view ? (
                        <div className="grid gap-3">
                            <p role="alert" className="text-destructive">
                                {view.error}
                            </p>
                            <Button type="button" variant="outline" className="w-fit" onClick={load}>
                                Try again
                            </Button>
                        </div>
                    ) : (
                        <>
                            {view.kind === "pdf" ? (
                                <iframe src={view.url} title={fileName} className="min-h-0 w-full flex-1 rounded border border-border" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element -- a signed URL for one admin, not an image to optimise
                                <img src={view.url} alt={fileName} className="max-h-full w-full object-contain" />
                            )}
                            <a href={view.url} target="_blank" rel="noreferrer noopener" className="text-sm text-primary underline">
                                Open in a new tab
                            </a>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
