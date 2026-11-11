"use client"

import { useState } from "react"

import { DOCUMENT_SLOT_OPTIONS } from "@/lib/types/property"

import { NoteField } from "./fields"

// What the admin asks the owner for, inside the change request form. A ticked item opens its note, which is required:
// it's what the owner sees beside that item's upload. Unticked items stay closed, so the form only asks for what's needed.
export function RequestItems({ offerIdentity }: { offerIdentity: boolean }) {
    const [ticked, setTicked] = useState<string[]>([])

    function toggle(slot: string, on: boolean) {
        setTicked((current) => (on ? [...current, slot] : current.filter((value) => value !== slot)))
    }

    return (
        <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">What to ask for</legend>
            {DOCUMENT_SLOT_OPTIONS.map((option) => (
                <div key={option.value} className="grid gap-2">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="slots"
                            value={option.value}
                            checked={ticked.includes(option.value)}
                            onChange={(event) => toggle(option.value, event.target.checked)}
                            className="size-4 accent-primary"
                        />
                        {option.title}
                    </label>
                    {ticked.includes(option.value) ? (
                        <div className="pl-6">
                            <NoteField
                                id={`changes-note-${option.value}`}
                                name={`note_${option.value}`}
                                label="What to send, and why"
                                hint="The owner sees this beside the upload."
                                required
                            />
                        </div>
                    ) : null}
                </div>
            ))}
            {offerIdentity ? (
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="identity" className="size-4 accent-primary" />
                    Their identity document (a Ghana Card or passport)
                </label>
            ) : null}
        </fieldset>
    )
}
