import { ActionForm } from "@/components/action-form"
import type { ActionState } from "@/lib/action-errors"
import { CHECKPOINT_STATUS_LABELS } from "@/lib/admin/labels"
import { ADMIN_CHECKPOINT_STATUSES, UNWAIVABLE_CHECKPOINTS } from "@/lib/validators/admin"

import { ChoiceField, NoteField } from "./fields"

type Props = {
    checkpointKey: string
    status: string
    publicNotes: string | null
    internalNotes: string | null
    // updateCheckpoint with the property and checkpoint already bound by the page
    action: (previous: ActionState, formData: FormData) => Promise<ActionState>
}

export function CheckpointForm({ checkpointKey, status, publicNotes, internalNotes, action }: Props) {
    const statuses = ADMIN_CHECKPOINT_STATUSES.filter(
        (value) => value !== "waived" || !UNWAIVABLE_CHECKPOINTS.includes(checkpointKey)
    )
    const options = Object.fromEntries(statuses.map((value) => [value, CHECKPOINT_STATUS_LABELS[value]]))
    const id = `checkpoint-${checkpointKey}`

    return (
        <details className="mt-2">
            <summary className="cursor-pointer text-sm text-primary">Update</summary>
            {/* 'submitted' isn't one an admin sets, so ChoiceField leaves it empty for the admin to pick */}
            <ActionForm action={action} submitLabel="Save" className="mt-3">
                <ChoiceField id={`${id}-status`} name="status" label="Status" options={options} defaultValue={status} />
                <NoteField
                    id={`${id}-public`}
                    name="public_note"
                    label="Owner sees"
                    hint="Needed for flagged or waived. The owner sees it (and is told when you flag), and so does the public once verified. Describe the issue; never name other people or properties."
                    defaultValue={publicNotes}
                />
                <NoteField id={`${id}-internal`} name="internal_note" label="Internal note" defaultValue={internalNotes} />
            </ActionForm>
        </details>
    )
}
