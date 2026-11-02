"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { ActionState } from "@/lib/admin/errors"

// The page binds the property id into the action, so this component never imports the actions module
export function StartReviewButton({ action }: { action: (previous: ActionState) => Promise<ActionState> }) {
    const [state, formAction, pending] = useActionState(action, null)

    return (
        <form action={formAction} className="flex flex-col items-start gap-1">
            <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                Start review
            </Button>
            {state?.error ? (
                <p role="alert" className="text-sm text-destructive">
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}
