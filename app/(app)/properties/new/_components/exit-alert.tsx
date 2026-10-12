"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { CircleCheck, LogOut, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"

export type ExitAlertVariant = "exit" | "saved"

type ExitAlertProps = {
    /** Which dialog to show, or null when closed */
    variant: ExitAlertVariant | null
    onClose: () => void
    onSaveAndLeave: () => void
    onLeave: () => void
}

type Copy = {
    icon: LucideIcon
    iconClassName: string
    title: string
    description: string
}

const COPY: Record<ExitAlertVariant, Copy> = {
    exit: {
        icon: LogOut,
        iconClassName: "bg-background text-primary",
        title: "Leave registration?",
        description:
            "Save a draft to finish registering this property later, or leave without saving and lose what you've entered.",
    },
    saved: {
        icon: CircleCheck,
        iconClassName: "bg-success-soft text-success",
        title: "Draft saved",
        description: "You can come back any time to finish registering this property.",
    },
}

export default function ExitAlert({ variant, onClose, onSaveAndLeave, onLeave }: ExitAlertProps) {
    // Keep showing the last variant while the dialog animates closed
    const [shown, setShown] = useState<ExitAlertVariant>(variant ?? "exit")
    if (variant !== null && variant !== shown) setShown(variant)
    const copy = COPY[shown]

    return (
        <AlertDialog.Root open={variant !== null} onOpenChange={(open) => !open && onClose()}>
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs motion-reduce:transition-none" />
                <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_24px_48px_-16px_rgba(16,42,67,0.28)] outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none sm:p-7">
                    <span
                        className={cn(
                            "flex size-11 items-center justify-center rounded-xl",
                            copy.iconClassName,
                        )}
                    >
                        <copy.icon size={20} aria-hidden />
                    </span>

                    <AlertDialog.Title className="text-heading mt-5 text-foreground">{copy.title}</AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-[15px] leading-relaxed text-copy">
                        {copy.description}
                    </AlertDialog.Description>

                    <div className="mt-7 flex flex-col gap-2">
                        {shown === "saved" ? (
                            <>
                                <AlertDialog.Close
                                    render={
                                        <Button className="pressable h-11 rounded-lg bg-secondary text-[15px] text-secondary-foreground hover:bg-secondary/90" />
                                    }
                                >
                                    Continue editing
                                </AlertDialog.Close>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onLeave}
                                    className="pressable h-11 rounded-lg text-[15px] text-primary hover:bg-background"
                                >
                                    Leave for now
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    onClick={onSaveAndLeave}
                                    className="pressable h-11 rounded-lg bg-secondary text-[15px] text-secondary-foreground hover:bg-secondary/90"
                                >
                                    Save draft and leave
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onLeave}
                                    className="pressable h-11 rounded-lg text-[15px] text-destructive hover:bg-destructive/5 hover:text-destructive"
                                >
                                    Leave without saving
                                </Button>
                                <AlertDialog.Close
                                    render={
                                        <Button
                                            variant="ghost"
                                            className="pressable h-11 rounded-lg text-[15px] text-primary hover:bg-background"
                                        />
                                    }
                                >
                                    Keep editing
                                </AlertDialog.Close>
                            </>
                        )}
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}
