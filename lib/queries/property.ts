import { useNewPropertyStore } from "@/stores/new-property-store";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useEffect, useRef } from "react";

import { PROPERTY_DOCUMENTS_BUCKET, documentMimeType } from "@/lib/storage/property-documents";
import { createClient } from "@/lib/supabase/client";
import {
    documentReferenceSchema,
    documentUploadSchema,
    draftDocumentSchema,
    draftSchema,
    savedDraftSchema,
    type AcquisitionDraft,
    type DocumentReference,
    type DocumentSlot,
    type DraftDocument,
    type PropertyDocumentType,
} from "@/lib/validators/property";

// How long the user must pause before their changes are saved
const AUTOSAVE_DELAY_MS = 1000

// The registration page; the draft's id is added to its URL so a refresh or shared link resumes the draft
const NEW_PROPERTY_PATH = "/account/dashboard/properties/new"

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
            const { propertyId, discarding, details, location, boundary, acquisition } = useNewPropertyStore.getState()
            // The draft is being deleted: saving now would create it again
            if (discarding) return null
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
            if (!saved) return
            setDraftSavedAt(new Date(saved.updatedAt))
            setDraftSaveFailed(false)
        },
        onError: () => setDraftSaveFailed(true),
        onSettled: () => setSavingDraft(false),
    })
}

/**
 * Deletes the draft and everything uploaded to it. Runs in the same queue as saves, so a save already under way
 * finishes first and the delete sees the draft's id; saves queued after it are skipped (see `discarding`).
 */
export function useDeleteDraft() {
    return useMutation({
        scope: { id: "save-draft" },
        mutationFn: async () => {
            const { propertyId, setDiscarding } = useNewPropertyStore.getState()
            setDiscarding(true)
            // Nothing was saved yet, so there is nothing on the server to delete
            if (!propertyId) return

            const response = await fetch(`/api/property/draft/${propertyId}`, { method: "DELETE" })
            // Already gone, for example deleted in another tab, which is what the user wanted
            if (!response.ok && response.status !== 404) {
                throw new Error(await errorMessage(response, "Unable to delete your draft right now."))
            }
        },
        // The draft is still there, so saving can carry on
        onError: () => useNewPropertyStore.getState().setDiscarding(false),
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

// The documents on a draft are cached under this key, so uploads, changes and removals on any screen show everywhere
function draftDocumentsKey(propertyId: string | undefined) {
    return ["draft-documents", propertyId] as const
}

function updateCachedDocuments(
    queryClient: QueryClient,
    propertyId: string | undefined,
    update: (documents: DraftDocument[]) => DraftDocument[],
) {
    queryClient.setQueryData<DraftDocument[]>(draftDocumentsKey(propertyId), (documents) => documents && update(documents))
}

/** The documents uploaded to the draft so far, oldest first. Empty until the draft has been saved. */
export function useDraftDocuments() {
    const propertyId = useNewPropertyStore((state) => state.propertyId)

    return useQuery({
        queryKey: draftDocumentsKey(propertyId),
        queryFn: async (): Promise<DraftDocument[]> => {
            const response = await fetch(`/api/property/draft/${propertyId}/documents`)
            if (!response.ok) throw new Error(await errorMessage(response, "Unable to load your documents right now."))
            return z.array(draftDocumentSchema).parse(await response.json())
        },
        // A draft that hasn't been saved has no documents
        enabled: !!propertyId,
        initialData: propertyId ? undefined : [],
    })
}

type UploadDocument = {
    file: File
    /** The checklist item the user added the file to */
    slot: DocumentSlot
}

/**
 * Uploads a document to the draft as soon as the user picks it, so it is kept even if they leave before finishing.
 * The document is recorded through the API, which says where to put the file, and the file goes straight to storage.
 */
export function useUploadDocument() {
    const { mutateAsync: saveDraft } = useHandleSaveDraft()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ file, slot }: UploadDocument): Promise<DocumentReference> => {
            // The same checks as the bucket, so the user hears about a wrong file before anything is sent
            const upload = documentUploadSchema.safeParse({
                slot,
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

            // Shown straight away; the list is fetched again in the background to pick up what the server stored
            updateCachedDocuments(queryClient, propertyId, (documents) => [
                ...documents,
                {
                    ...document,
                    slot,
                    declared_type: null,
                    file_size_bytes: upload.data.file_size_bytes,
                    mime_type: upload.data.mime_type,
                    created_at: new Date().toISOString(),
                },
            ])
            void queryClient.invalidateQueries({ queryKey: draftDocumentsKey(propertyId) })
            return document
        },
    })
}

type SetDeclaredType = {
    document: DraftDocument
    declared_type: PropertyDocumentType | null
}

/** Records what the user says a document is. The choice shows at once and is undone if it can't be saved. */
export function useSetDeclaredType() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ document, declared_type }: SetDeclaredType) => {
            const { propertyId } = useNewPropertyStore.getState()
            const response = await fetch(`/api/property/draft/${propertyId}/documents/${document.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ declared_type }),
            })
            if (!response.ok) throw new Error(await errorMessage(response, "Unable to save what this document is right now."))
            return draftDocumentSchema.parse(await response.json())
        },
        onMutate: ({ document, declared_type }) => {
            const { propertyId } = useNewPropertyStore.getState()
            updateCachedDocuments(queryClient, propertyId, (documents) =>
                documents.map((each) => (each.id === document.id ? { ...each, declared_type } : each)),
            )
            return { propertyId }
        },
        onError: (_error, { document }, context) => {
            updateCachedDocuments(queryClient, context?.propertyId, (documents) =>
                documents.map((each) => (each.id === document.id ? { ...each, declared_type: document.declared_type } : each)),
            )
        },
    })
}

// An answer to the acquisition question that points to a removed document would no longer save, so the link is dropped
function forgetAcquisitionDocument(documentId: string) {
    const { acquisition, setAcquisition } = useNewPropertyStore.getState()
    if (!acquisition || !("document" in acquisition.metadata) || acquisition.metadata.document?.id !== documentId) return
    setAcquisition({ ...acquisition, metadata: { ...acquisition.metadata, document: undefined } } as AcquisitionDraft)
}

/** Removes an uploaded document and its file from the draft */
export function useRemoveDocument() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (document: DocumentReference) => {
            const { propertyId } = useNewPropertyStore.getState()
            const response = await fetch(`/api/property/draft/${propertyId}/documents/${document.id}`, { method: "DELETE" })
            // Already gone is as good as removed
            if (!response.ok && response.status !== 404) {
                throw new Error(await errorMessage(response, "Unable to remove your document right now."))
            }

            forgetAcquisitionDocument(document.id)
            updateCachedDocuments(queryClient, propertyId, (documents) => documents.filter((each) => each.id !== document.id))
        },
    })
}

/**
 * Sends the draft for review, then shows the confirmation.
 * It shares the draft saves' scope, so a save still running when the user submits finishes first.
 */
export function useSubmitDraft() {
    return useMutation({
        scope: { id: "save-draft" },
        mutationFn: async () => {
            const { propertyId } = useNewPropertyStore.getState()
            if (!propertyId) throw new Error("Your draft hasn't saved yet. Try again in a moment.")

            const response = await fetch(`/api/property/draft/${propertyId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // The review screen only submits once the user has ticked the declaration
                body: JSON.stringify({ confirmed: true }),
            })
            if (!response.ok) throw new Error(await errorMessage(response, "Unable to submit your property right now."))
            return z.object({ slug: z.string() }).parse(await response.json())
        },
        onSuccess: () => {
            // The submitted property is no longer a draft, so a refresh shouldn't try to resume it
            if (window.location.pathname === NEW_PROPERTY_PATH) window.history.replaceState(null, "", NEW_PROPERTY_PATH)
            useNewPropertyStore.getState().setScreen("confirmation")
        },
    })
}
