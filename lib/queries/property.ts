import { useNewPropertyStore } from "@/stores/new-property-store";
import { useMutation } from "@tanstack/react-query";

import { draftSchema, type Draft } from "@/lib/validators/property";

// Saves whatever the user has entered so far. Drafts can be incomplete, so only their shape is checked.
export function useHandleSaveDraft() {
    const setSavingDraft = useNewPropertyStore((state) => state.setSavingDraft)
    const setDraftSavedAt = useNewPropertyStore((state) => state.setDraftSavedAt)

    return useMutation({
        mutationKey: ["save-draft"],
        mutationFn: async () => {
            // Read the store when the save runs, not when the component last rendered, so the latest edit is sent
            const { details } = useNewPropertyStore.getState()
            // Parse so the body always matches what the API accepts; this also trims the text fields
            const draft: Draft = draftSchema.parse({ details })

            const response = await fetch("/api/property/draft", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(draft),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
                throw new Error(data.error?.message ?? "Unable to save your draft right now.");
            }
        },
        onMutate: () => setSavingDraft(true),
        onSuccess: () => {
            setDraftSavedAt(new Date())
        },
        onSettled: () => setSavingDraft(false),
    })
}
