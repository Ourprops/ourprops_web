"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { CloudCheck, Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

type ExitAlertProps = {
    open: boolean
    onClose: () => void
    onLeave: () => void
    /** Deletes the draft; left out when nothing has been saved, so there is nothing to delete */
    onDelete?: () => void
    deleting?: boolean
    /** Why the last delete failed */
    deleteError?: string
}

export default function ExitAlert({ open, onClose, onLeave, onDelete, deleting = false, deleteError }: ExitAlertProps) {
    // Deleting can't be undone, so it takes a second, explicit step
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    function handleOpenChange(next: boolean) {
        // Stays open while the delete is under way, so the user sees it finish or fail
        if (next || deleting) return
        setConfirmingDelete(false)
        onClose()
    }

    return (
        <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs motion-reduce:transition-none" />
                <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_24px_48px_-16px_rgba(16,42,67,0.28)] outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none sm:p-7">
                    {confirmingDelete ? (
                        <>
                            <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                                <Trash2 size={20} aria-hidden />
                            </span>

                            <AlertDialog.Title className="text-heading mt-5 text-foreground">Delete this draft?</AlertDialog.Title>
                            <AlertDialog.Description className="mt-2 text-[15px] leading-relaxed text-copy">
                                This deletes your answers and every document you uploaded for this property. You
                                can&apos;t undo this.
                            </AlertDialog.Description>

                            {deleteError && (
                                <p role="alert" className="mt-4 text-sm text-destructive">
                                    {deleteError}
                                </p>
                            )}

                            <div className="mt-7 flex flex-col gap-2">
                                <Button
                                    type="button"
                                    onClick={onDelete}
                                    disabled={deleting}
                                    className="pressable h-11 rounded-lg bg-destructive text-[15px] text-white hover:bg-destructive/90"
                                >
                                    {deleting ? "Deleting…" : "Delete draft"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setConfirmingDelete(false)}
                                    disabled={deleting}
                                    className="pressable h-11 rounded-lg text-[15px] text-primary hover:bg-background"
                                >
                                    Keep the draft
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success">
                                <CloudCheck size={20} aria-hidden />
                            </span>

                            <AlertDialog.Title className="text-heading mt-5 text-foreground">Leave registration?</AlertDialog.Title>
                            <AlertDialog.Description className="mt-2 text-[15px] leading-relaxed text-copy">
                                Don&apos;t worry, we save your progress as a draft as you go. You can come back any time
                                to finish registering this property.
                            </AlertDialog.Description>

                            <div className="mt-7 flex flex-col gap-2">
                                <AlertDialog.Close
                                    render={
                                        <Button className="pressable h-11 rounded-lg bg-secondary text-[15px] text-secondary-foreground hover:bg-secondary/90" />
                                    }
                                >
                                    Keep editing
                                </AlertDialog.Close>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onLeave}
                                    className="pressable h-11 rounded-lg text-[15px] text-primary hover:bg-background"
                                >
                                    Leave for now
                                </Button>
                                {onDelete && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setConfirmingDelete(true)}
                                        className="pressable h-11 rounded-lg text-[15px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 size={16} aria-hidden />
                                        Delete this draft
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}
