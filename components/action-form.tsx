"use client"

import { startTransition, useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { ActionState } from "@/lib/action-errors"
import { cn } from "@/lib/utils"

type Props = {
    // A server action, with its ids already bound by the page
    action: (previous: ActionState, formData: FormData) => Promise<ActionState>
    submitLabel: string
    // cta is the orange main action on owner pages
    variant?: "default" | "outline" | "destructive" | "cta"
    // Turns the button off without hiding it, e.g. while approval is blocked; the database decides all the same
    disabled?: boolean
    className?: string
    children?: React.ReactNode
}

// A form for one server action. The fields are plain inputs the page puts inside it.
export function ActionForm({ action, submitLabel, variant = "default", disabled, className, children }: Props) {
    const [state, formAction, pending] = useActionState(action, null)

    // A form action resets the form when it finishes, which would wipe what the admin typed if the database
    // refuses it. Calling the action ourselves skips that reset; on success refresh() brings the saved values.
    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        startTransition(() => formAction(formData))
    }

    return (
        <form onSubmit={submit} className={cn("grid gap-3", className)}>
            {children}
            <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant={variant} disabled={pending || disabled}>
                    {pending ? <Spinner /> : null}
                    {submitLabel}
                </Button>
                {state?.error ? (
                    <p role="alert" className="text-sm text-destructive">
                        {state.error}
                    </p>
                ) : null}
            </div>
        </form>
    )
}
