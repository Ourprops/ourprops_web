"use client"

import { ArrowLeft, Check, Cloud, CloudAlert, CloudCheck, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteDraft, useHandleSaveDraft } from "@/lib/queries/property"
import { cn } from "@/lib/utils"
import { useNewPropertyStore, type FlowMode, type Screen } from "@/stores/new-property-store"

import ExitAlert from "./exit-alert"

// Where the user goes when they leave the flow: the dashboard, or the property's page while changing it
const EXIT_HREF = "/account/dashboard"

type Step = {
    title: string
    screens: Screen[]
}

// The flow has more screens than the three steps promised on the start screen,
// so related screens are grouped under one step.
const STEPS: Step[] = [
    { title: "Property details", screens: ["details"] },
    { title: "Location and boundary", screens: ["location", "boundary"] },
    { title: "Ownership and documents", screens: ["acquisition", "documents"] },
]

// While changing a submitted property there is no documents screen: documents go through its requests
const CHANGE_STEPS: Step[] = [
    { title: "Property details", screens: ["details"] },
    { title: "Location and boundary", screens: ["location", "boundary"] },
    { title: "Ownership", screens: ["acquisition"] },
]

export default function ProgressIndicator() {
    const screen = useNewPropertyStore((state) => state.screen)
    const handleBack = useNewPropertyStore((state) => state.handleBack)
    const savingDraft = useNewPropertyStore((state) => state.savingDraft)
    const draftSavedAt = useNewPropertyStore((state) => state.draftSavedAt)
    const draftSaveFailed = useNewPropertyStore((state) => state.draftSaveFailed)
    const propertyId = useNewPropertyStore((state) => state.propertyId)
    const mode = useNewPropertyStore((state) => state.mode)
    const { mutate: saveDraft } = useHandleSaveDraft()
    const deleteDraft = useDeleteDraft()
    const router = useRouter()
    const [exitOpen, setExitOpen] = useState(false)

    function handleLeave() {
        // The draft is saved automatically, so leaving keeps it for the user to resume
        setExitOpen(false)
        router.push(mode === "changes" && propertyId ? `/account/dashboard/properties/${propertyId}` : EXIT_HREF)
    }

    function handleDelete() {
        // The dialog stays open until the dashboard replaces this page, so the user sees the delete through
        deleteDraft.mutate(undefined, { onSuccess: () => router.push(EXIT_HREF) })
    }

    if (screen === "start" || screen === "confirmation") return null

    const steps = mode === "changes" ? CHANGE_STEPS : STEPS
    const isReview = screen === "review"
    // On review every step is complete, so no step is marked current
    const current = isReview ? steps.length : steps.findIndex((step) => step.screens.includes(screen))

    return (
        <header className="material sticky top-0 z-40 border-b border-border">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 pt-3 pb-4 md:pt-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        aria-label="Back"
                        className="pressable size-9 justify-self-start rounded-lg text-primary hover:bg-background"
                    >
                        <ArrowLeft size={18} aria-hidden />
                    </Button>

                    <div className="min-w-0 text-center" aria-live="polite">
                        <p className="text-eyebrow text-muted-foreground">
                            {isReview ? "All steps done" : `Step ${current + 1} of ${steps.length}`}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                            {isReview ? "Review" : steps[current].title}
                        </p>
                    </div>

                    <div className="flex items-center gap-1 justify-self-end">
                        <SaveStatus
                            mode={mode}
                            saving={savingDraft}
                            savedAt={draftSavedAt}
                            failed={draftSaveFailed}
                            onRetry={() => saveDraft()}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setExitOpen(true)}
                            aria-label="Exit"
                            className="pressable size-9 rounded-lg text-primary hover:bg-background"
                        >
                            <X size={18} aria-hidden />
                        </Button>
                    </div>
                </div>

                <nav aria-label="Progress">
                    <ol className="flex gap-2">
                        {steps.map(({ title: step }, index) => {
                            const isComplete = index < current
                            const isCurrent = index === current

                            return (
                                <li
                                    key={step}
                                    aria-current={isCurrent ? "step" : undefined}
                                    className="flex min-w-0 flex-1 flex-col gap-2"
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "h-1.5 rounded-full transition-colors duration-300 motion-reduce:transition-none",
                                            isComplete && "bg-primary",
                                            isCurrent && "bg-secondary",
                                            !isComplete && !isCurrent && "bg-border",
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            "hidden items-center gap-1.5 truncate text-xs font-medium sm:flex",
                                            isComplete && "text-primary",
                                            isCurrent && "text-foreground",
                                            !isComplete && !isCurrent && "text-muted-foreground",
                                        )}
                                    >
                                        {isComplete && <Check size={13} strokeWidth={2.5} aria-hidden />}
                                        <span className="truncate">{step}</span>
                                        <span className="sr-only">
                                            {isComplete ? "(completed)" : isCurrent ? "(current)" : "(not started)"}
                                        </span>
                                    </span>
                                </li>
                            )
                        })}
                    </ol>
                </nav>
            </div>

            <ExitAlert
                mode={mode}
                open={exitOpen}
                onClose={() => {
                    deleteDraft.reset()
                    setExitOpen(false)
                }}
                onLeave={handleLeave}
                // Only drafts are ever deleted (docs/admin.md, section 5)
                onDelete={propertyId && mode === "draft" ? handleDelete : undefined}
                // Stays "deleting" after success too, until the page changes, so the buttons can't be pressed again
                deleting={deleteDraft.isPending || deleteDraft.isSuccess}
                deleteError={deleteDraft.error?.message}
            />
        </header>
    )
}

type SaveStatusProps = {
    mode: FlowMode
    saving: boolean
    savedAt: Date | null
    /** Whether the last save failed */
    failed: boolean
    onRetry: () => void
}

// Shows that the draft saves itself, so the user doesn't need to think about saving
function SaveStatus({ mode, saving, savedAt, failed, onRetry }: SaveStatusProps) {
    // A failed save is retried on the next change, but the user can also retry straight away
    if (failed && !saving) {
        return (
            <p role="alert" className="flex h-9 items-center">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onRetry}
                    title="Your latest changes aren't saved yet. Check your connection and try again."
                    className="pressable h-9 gap-1.5 rounded-lg px-2 text-sm font-medium text-destructive hover:bg-background hover:text-destructive sm:px-3"
                >
                    <CloudAlert size={16} aria-hidden />
                    <span className="sr-only sm:not-sr-only">Couldn&apos;t save.</span> Retry
                </Button>
            </p>
        )
    }

    const label = saving ? "Saving…" : savedAt ? (mode === "changes" ? "Changes saved" : "Draft saved") : "Autosave on"
    
    return (
        <p
            role="status"
            title={
                mode === "changes"
                    ? "Your changes are saved as you go. Send the property back for review from its page."
                    : "Your progress is saved as a draft automatically, so you can leave and finish later."
            }
            className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground sm:px-3"
        >
            {saving ? (
                <Spinner aria-hidden className="text-primary motion-reduce:animate-none" />
            ) : savedAt ? (
                <CloudCheck size={16} className="text-success" aria-hidden />
            ) : (
                <Cloud size={16} aria-hidden />
            )}
            <span className="sr-only sm:not-sr-only">{label}</span>
        </p>
    )
}
