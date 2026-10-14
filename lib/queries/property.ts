import { useNewPropertyStore } from "@/stores/new-property-store";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { draftSchema, savedDraftSchema } from "@/lib/validators/property";

// How long the user must pause before their changes are saved
const AUTOSAVE_DELAY_MS = 1000

// The registration page; the draft's id is added to its URL so a refresh or shared link resumes the draft
const NEW_PROPERTY_PATH = "/properties/new"

// Saves whatever the user has entered so far. Drafts can be incomplete, so only their shape is checked.
export function useHandleSaveDraft() {
    const setSavingDraft = useNewPropertyStore((state) => state.setSavingDraft)
    const setDraftSavedAt = useNewPropertyStore((state) => state.setDraftSavedAt)

    return useMutation({
        mutationKey: ["save-draft"],
        // Saves run one at a time, so the second save waits for the first to create the draft and then updates it,
        // rather than creating a second draft or finishing before an older save
        scope: { id: "save-draft" },
        mutationFn: async () => {
            // Read the store when the save runs, not when it was queued, so the latest edit and the draft's id are used
            const { propertyId, details, location } = useNewPropertyStore.getState()
            // Parse so the body always matches what the API accepts; this also trims the text fields
            const draft = draftSchema.parse({ details, location })
            console.log("Saving draft", propertyId, draft)
            const response = await fetch(propertyId ? `/api/property/draft/${propertyId}` : "/api/property/draft", {
                method: propertyId ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(draft),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
                throw new Error(data.error?.message ?? "Unable to save your draft right now.");
            }

            const saved = savedDraftSchema.parse(await response.json())
            if (!propertyId) {
                // Store the id before this save finishes so the next queued save updates this draft
                useNewPropertyStore.getState().setPropertyId(saved.id)
                if (window.location.pathname === NEW_PROPERTY_PATH) {
                    window.history.replaceState(null, "", `${NEW_PROPERTY_PATH}?draft=${saved.id}`)
                }
            }
            return saved
        },
        onMutate: () => setSavingDraft(true),
        onSuccess: (saved) => {
            setDraftSavedAt(new Date(saved.updatedAt))
        },
        onSettled: () => setSavingDraft(false),
    })
}

/**
 * Saves the draft once the user has stopped changing `values` for a second.
 * Nothing is saved on first load or when an edit is undone back to what was last saved,
 * and a change still waiting when the screen closes (Continue, Back or Exit) is saved straight away.
 */
export function useAutosaveDraft(values: unknown[]) {
    const { mutate: saveDraft } = useHandleSaveDraft()
    const key = JSON.stringify(values)
    const lastSaved = useRef(key)
    const pending = useRef(false)

    useEffect(() => {
        if (key === lastSaved.current) {
            pending.current = false
            return
        }

        pending.current = true
        const timeout = setTimeout(() => {
            pending.current = false
            lastSaved.current = key
            saveDraft()
        }, AUTOSAVE_DELAY_MS)
        return () => clearTimeout(timeout)
    }, [key, saveDraft])

    useEffect(() => {
        return () => {
            if (pending.current) saveDraft()
        }
    }, [saveDraft])
}
