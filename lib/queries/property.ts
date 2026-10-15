import { useNewPropertyStore } from "@/stores/new-property-store";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { PROPERTY_DOCUMENTS_BUCKET, documentMimeType } from "@/lib/storage/property-documents";
import { createClient } from "@/lib/supabase/client";
import {
    documentReferenceSchema,
    documentUploadSchema,
    draftSchema,
    savedDraftSchema,
    type DocumentReference,
} from "@/lib/validators/property";

// How long the user must pause before their changes are saved
const AUTOSAVE_DELAY_MS = 1000

// The registration page; the draft's id is added to its URL so a refresh or shared link resumes the draft
const NEW_PROPERTY_PATH = "/properties/new"

// Saves whatever the user has entered so far. Drafts can be incomplete, so only their shape is checked.
export function useHandleSaveDraft() {
    const setSavingDraft = useNewPropertyStore((state) => state.setSavingDraft)
    const setDraftSavedAt = useNewPropertyStore((state) => state.setDraftSavedAt)
    const setDraftSaveFailed = useNewPropertyStore((state) => state.setDraftSaveFailed)

    return useMutation({
        mutationKey: ["save-draft"],
        // Saves run one at a time, so the second save waits for the first to create the draft and then updates it,
        // rather than creating a second draft or finishing before an older save
        scope: { id: "save-draft" },
        mutationFn: async () => {
            // Read the store when the save runs, not when it was queued, so the latest edit and the draft's id are used
            const { propertyId, details, location, boundary, acquisition } = useNewPropertyStore.getState()
            // Parse so the body always matches what the API accepts; this also trims the text fields
            const draft = draftSchema.parse({ details, location, boundary, acquisition })
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
            setDraftSaveFailed(false)
        },
        onError: () => setDraftSaveFailed(true),
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

async function errorMessage(response: Response, fallback: string) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    return data.error?.message ?? fallback
}

/**
 * Uploads a document to the draft as soon as the user picks it, so it is kept even if they leave before finishing.
 * The document is recorded through the API, which says where to put the file, and the file goes straight to storage.
 */
export function useUploadDocument() {
    const { mutateAsync: saveDraft } = useHandleSaveDraft()

    return useMutation({
        mutationFn: async (file: File): Promise<DocumentReference> => {
            // The same checks as the bucket, so the user hears about a wrong file before anything is sent
            const upload = documentUploadSchema.safeParse({
                file_name: file.name,
                file_size_bytes: file.size,
                mime_type: documentMimeType(file),
            })
            if (!upload.success) throw new Error(upload.error.issues[0]?.message ?? "This file can't be uploaded.")

            // A document belongs to a draft, so the draft is saved first if it hasn't been yet
            if (!useNewPropertyStore.getState().propertyId) await saveDraft()
            const { propertyId } = useNewPropertyStore.getState()
            if (!propertyId) throw new Error("Your draft hasn't saved yet. Try again in a moment.")

            const response = await fetch(`/api/property/draft/${propertyId}/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(upload.data),
            })
            if (!response.ok) throw new Error(await errorMessage(response, "Unable to upload your document right now."))
            const document = documentReferenceSchema.parse(await response.json())

            const { error } = await createClient()
                .storage.from(PROPERTY_DOCUMENTS_BUCKET)
                .upload(document.path, file, { contentType: upload.data.mime_type, upsert: false })
            if (error) {
                // Don't leave a record of a file that never arrived
                await fetch(`/api/property/draft/${propertyId}/documents/${document.id}`, { method: "DELETE" }).catch(() => {})
                throw new Error("The file didn't upload. Check your connection and try again.")
            }

            return document
        },
    })
}

/** Removes an uploaded document and its file from the draft */
export function useRemoveDocument() {
    return useMutation({
        mutationFn: async (document: DocumentReference) => {
            const { propertyId } = useNewPropertyStore.getState()
            const response = await fetch(`/api/property/draft/${propertyId}/documents/${document.id}`, { method: "DELETE" })
            // Already gone is as good as removed
            if (!response.ok && response.status !== 404) {
                throw new Error(await errorMessage(response, "Unable to remove your document right now."))
            }
        },
    })
}
