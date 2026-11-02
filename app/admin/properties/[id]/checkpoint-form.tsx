"use client"

import { startTransition, useActionState, useId } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { ActionState } from "@/lib/admin/errors"
import { CHECKPOINT_STATUS_LABELS } from "@/lib/admin/labels"
import {
    ADMIN_CHECKPOINT_STATUSES,
    MAX_CHECKPOINT_NOTE_LENGTH,
    UNWAIVABLE_CHECKPOINTS,
} from "@/lib/validators/admin"

type Props = {
    checkpointKey: string
    status: string
    publicNotes: string | null
    internalNotes: string | null
    // updateCheckpoint with the property and checkpoint already bound by the page
    action: (previous: ActionState, formData: FormData) => Promise<ActionState>
}

export function CheckpointForm({ checkpointKey, status, publicNotes, internalNotes, action }: Props) {
    const [state, formAction, pending] = useActionState(action, null)
    const id = useId()

    const statuses = ADMIN_CHECKPOINT_STATUSES.filter(
        (value) => value !== "waived" || !UNWAIVABLE_CHECKPOINTS.includes(checkpointKey)
    )
    const items = Object.fromEntries(statuses.map((value) => [value, CHECKPOINT_STATUS_LABELS[value]]))
    // 'submitted' isn't one an admin sets, so the admin picks one rather than resending it
    const current = (statuses as readonly string[]).includes(status) ? status : null

    // A form action resets the form when it finishes, which would wipe what the admin typed if the database
    // refuses it. Calling the action ourselves skips that reset; on success refresh() brings the saved values.
    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        startTransition(() => formAction(formData))
    }

    return (
        <details className="mt-2">
            <summary className="cursor-pointer text-sm text-primary">Update</summary>
            <form onSubmit={submit} className="mt-3 grid gap-3">
                <div className="grid gap-1.5">
                    <Label htmlFor={`${id}-status`}>Status</Label>
                    <Select name="status" items={items} defaultValue={current}>
                        <SelectTrigger id={`${id}-status`} className="h-9 w-full sm:w-64">
                            <SelectValue placeholder="Choose a status" />
                        </SelectTrigger>
                        <SelectContent>
                            {statuses.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {CHECKPOINT_STATUS_LABELS[value]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`${id}-public`}>Owner sees</Label>
                    <Textarea
                        id={`${id}-public`}
                        name="public_note"
                        defaultValue={publicNotes ?? ""}
                        maxLength={MAX_CHECKPOINT_NOTE_LENGTH}
                        aria-describedby={`${id}-public-hint`}
                    />
                    <p id={`${id}-public-hint`} className="text-xs text-muted-foreground">
                        Needed for flagged or waived. Shown to the owner, and on the public page once active.
                    </p>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`${id}-internal`}>Internal note</Label>
                    <Textarea
                        id={`${id}-internal`}
                        name="internal_note"
                        defaultValue={internalNotes ?? ""}
                        maxLength={MAX_CHECKPOINT_NOTE_LENGTH}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={pending}>
                        {pending ? <Spinner /> : null}
                        Save
                    </Button>
                    {state?.error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {state.error}
                        </p>
                    ) : null}
                </div>
            </form>
        </details>
    )
}
