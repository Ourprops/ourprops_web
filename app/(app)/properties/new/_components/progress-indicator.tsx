"use client"

import { ArrowLeft, Check, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useNewPropertyStore, type Screen } from "@/stores/new-property-store"

import ExitAlert, { type ExitAlertVariant } from "./exit-alert"
import { useMutation } from "@tanstack/react-query"

// Where the user goes when they leave the flow
const EXIT_HREF = "/"

type Step = {
    title: string
    screens: Screen[]
}

// The flow has more screens than the three steps promised on the start screen,
// so related screens are grouped under one step.
const STEPS: Step[] = [
    { title: "Property details", screens: ["details"] },
    { title: "Location and boundary", screens: ["location", "map"] },
    { title: "Ownership and documents", screens: ["acquisition", "documents"] },
]

export default function ProgressIndicator() {
    const screen = useNewPropertyStore((state) => state.screen)
    const handleBack = useNewPropertyStore((state) => state.handleBack)
    const reset = useNewPropertyStore((state) => state.reset)
    const router = useRouter()
    const [alert, setAlert] = useState<ExitAlertVariant | null>(null);

    const handleSaveDraft = useMutation({
        mutationFn: async () => {

        },
        onSuccess: () => {
            setAlert("saved")
        }
    })


    function handleSaveAndLeave() {
        // saveDraft()
        setAlert(null)
        router.push(EXIT_HREF)
    }

    function handleLeave() {
        // A saved draft is kept so the user can resume it; otherwise start over next time
        if (alert === "exit") reset()
        setAlert(null)
        router.push(EXIT_HREF)
    }

    if (screen === "start" || screen === "confirmation") return null

    const isReview = screen === "review"
    // On review every step is complete, so no step is marked current
    const current = isReview ? STEPS.length : STEPS.findIndex((step) => step.screens.includes(screen))

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
                            {isReview ? "All steps done" : `Step ${current + 1} of ${STEPS.length}`}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                            {isReview ? "Review" : STEPS[current].title}
                        </p>
                    </div>

                    <div className="flex items-center gap-1 justify-self-end">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleSaveDraft.mutate()}
                            className="pressable h-9 w-9 rounded-lg px-0 text-sm font-medium text-primary hover:bg-background sm:w-auto sm:px-3"
                        >
                            <Save size={16} aria-hidden />
                            <span className="sr-only sm:not-sr-only">Save draft</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setAlert("exit")}
                            aria-label="Exit"
                            className="pressable size-9 rounded-lg text-primary hover:bg-background"
                        >
                            <X size={18} aria-hidden />
                        </Button>
                    </div>
                </div>

                <nav aria-label="Progress">
                    <ol className="flex gap-2">
                        {STEPS.map(({ title: step }, index) => {
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
                variant={alert}
                onClose={() => setAlert(null)}
                onSaveAndLeave={handleSaveAndLeave}
                onLeave={handleLeave}
            />
        </header>
    )
}
