"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { CloudCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

type ExitAlertProps = {
    open: boolean
    onClose: () => void
    onLeave: () => void
}

export default function ExitAlert({ open, onClose, onLeave }: ExitAlertProps) {
    return (
        <AlertDialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs motion-reduce:transition-none" />
                <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_24px_48px_-16px_rgba(16,42,67,0.28)] outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none sm:p-7">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success">
                        <CloudCheck size={20} aria-hidden />
                    </span>

                    <AlertDialog.Title className="text-heading mt-5 text-foreground">Leave registration?</AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-[15px] leading-relaxed text-copy">
                        Don&apos;t worry, we save your progress as a draft as you go. You can come back any time to
                        finish registering this property.
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
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}
