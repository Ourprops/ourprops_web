"use server"

import { refresh } from "next/cache"
import { z } from "zod"

import { actionErrorMessage, type ActionState } from "@/lib/action-errors"
import { DOCUMENT_ERRORS, type DocumentView, openDocument } from "@/lib/admin/document-preview"
import { requireAdmin } from "@/lib/auth/staff"
import {
    changeRequestSchema,
    checkpointUpdateSchema,
    classificationSchema,
    documentReviewSchema,
    encumbranceRecordSchema,
    encumbranceUpdateSchema,
    overlapResolutionSchema,
    reopenSchema,
    suspensionSchema,
} from "@/lib/validators/admin"
import { propertyIdSchema } from "@/lib/validators/property"

// Every action here is a public POST endpoint, whatever page shows its button, so each one checks the caller
// itself, first. requireAdmin() redirects or 404s by throwing, which is why nothing below wraps it in try/catch.
// The page binds the ids, but bound values make a round trip through the browser, so they are checked again;
// the database function decides everything else (docs/admin.md, section 5).

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"]

// Calls one review function as the signed-in admin, then reloads the page so it shows the change and the
// entry in History. Not exported, so it isn't an endpoint of its own.
async function callReviewFunction(supabase: Supabase, name: string, args: Record<string, unknown>): Promise<ActionState> {
    const { error } = await supabase.rpc(name, args)
    if (error) {
        console.error(`${name} failed`, error)
        return { error: actionErrorMessage(error) }
    }
    refresh()
    return null
}

// A text field: missing counts as empty, which the functions store as no note
function text(formData: FormData, name: string) {
    return formData.get(name) ?? ""
}

// Takes a submitted property into review and creates its seven checkpoints
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState passes the previous state first
export async function startReview(propertyId: string, _previous: ActionState): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    if (!propertyIdSchema.safeParse(propertyId).success) {
        return { error: "Property not found." }
    }

    return callReviewFunction(supabase, "start_review", { property_id: propertyId })
}

// Sets one checkpoint's status and notes. public_note is what the owner sees; internal_note they never do.
export async function updateCheckpoint(
    propertyId: string,
    checkpointKey: string,
    _previous: ActionState,
    formData: FormData
): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = checkpointUpdateSchema.safeParse({
        propertyId,
        checkpointKey,
        status: formData.get("status"),
        publicNote: text(formData, "public_note"),
        internalNote: text(formData, "internal_note"),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const update = parsed.data
    return callReviewFunction(supabase, "update_checkpoint", {
        property_id: update.propertyId,
        checkpoint_key: update.checkpointKey,
        status: update.status,
        public_note: update.publicNote,
        internal_note: update.internalNote,
    })
}

// Sets the ownership type and structure, which approval needs
export async function classifyProperty(propertyId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = classificationSchema.safeParse({
        propertyId,
        ownershipType: formData.get("ownership_type"),
        ownershipStructure: formData.get("ownership_structure"),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    return callReviewFunction(supabase, "classify_property", {
        property_id: parsed.data.propertyId,
        ownership_type: parsed.data.ownershipType,
        ownership_structure: parsed.data.ownershipStructure,
    })
}

// Sets a document's final type and outcome. The note is shown to the owner.
export async function reviewDocument(documentId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = documentReviewSchema.safeParse({
        documentId,
        documentType: text(formData, "document_type"),
        status: formData.get("status"),
        note: text(formData, "note"),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    return callReviewFunction(supabase, "review_document", {
        document_id: parsed.data.documentId,
        document_type: parsed.data.documentType,
        verification_status: parsed.data.status,
        note: parsed.data.note,
    })
}

// Opens a document: checks and converts it on first open, then returns a short-lived URL for the viewer.
// Nothing on the page changes, so there is no refresh.
export async function openPropertyDocument(documentId: string): Promise<DocumentView> {
    const { supabase } = await requireAdmin()

    if (!z.uuid().safeParse(documentId).success) {
        return { error: DOCUMENT_ERRORS.notFound }
    }

    return openDocument(supabase, documentId)
}

// Moves an overlap flag to investigating, or resolves it. The note is internal.
export async function resolveOverlap(flagId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = overlapResolutionSchema.safeParse({
        flagId,
        status: formData.get("status"),
        note: text(formData, "note"),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    return callReviewFunction(supabase, "resolve_overlap", {
        flag_id: parsed.data.flagId,
        status: parsed.data.status,
        note: parsed.data.note,
    })
}

// Makes the property active and tells the owner; approve_property refuses while anything blocks it
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState passes the previous state first
export async function approveProperty(propertyId: string, _previous: ActionState): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    if (!propertyIdSchema.safeParse(propertyId).success) {
        return { error: "Property not found." }
    }

    return callReviewFunction(supabase, "approve_property", { property_id: propertyId })
}

// Pauses an active property's verification. The reason is shown to the owner.
export async function suspendProperty(propertyId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = suspensionSchema.safeParse({ propertyId, reason: text(formData, "reason") })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    return callReviewFunction(supabase, "suspend_property", {
        property_id: parsed.data.propertyId,
        reason: parsed.data.reason,
    })
}

// Takes a suspended property back into review, resetting the checkpoints chosen
export async function reopenReview(propertyId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = reopenSchema.safeParse({
        propertyId,
        note: text(formData, "note"),
        checkpoints: formData.getAll("checkpoints"),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    return callReviewFunction(supabase, "reopen_review", {
        property_id: parsed.data.propertyId,
        note: parsed.data.note,
        checkpoints: parsed.data.checkpoints,
    })
}

// Asks the owner for documents, each a checklist item and a note, and sends the property to action_required.
// The form has a checkbox per item, posted as "slots", and a note for each, posted as "note_<slot>".
export async function requestChanges(propertyId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = changeRequestSchema.safeParse({
        propertyId,
        message: text(formData, "message"),
        documents: formData.getAll("slots").map((slot) => ({
            slot,
            note: typeof slot === "string" ? text(formData, `note_${slot}`) : "",
        })),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    return callReviewFunction(supabase, "request_changes", {
        property_id: parsed.data.propertyId,
        message: parsed.data.message,
        documents: parsed.data.documents,
        identity: false,
    })
}

// Records a court case or registered encumbrance; one that blocks activation flags encumbrance_clearance
export async function recordEncumbrance(propertyId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = encumbranceRecordSchema.safeParse({
        propertyId,
        kind: formData.get("kind"),
        reference: text(formData, "reference"),
        blocksActivation: formData.get("blocks_activation"),
        note: text(formData, "note"),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    return callReviewFunction(supabase, "record_encumbrance", {
        property_id: parsed.data.propertyId,
        kind: parsed.data.kind,
        reference: parsed.data.reference,
        blocks_activation: parsed.data.blocksActivation,
        note: parsed.data.note,
    })
}

// Changes whether an encumbrance blocks activation, or resolves or reopens it, with a reason
export async function updateEncumbrance(encumbranceId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = encumbranceUpdateSchema.safeParse({
        encumbranceId,
        blocksActivation: formData.get("blocks_activation"),
        status: formData.get("status"),
        note: text(formData, "note"),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    return callReviewFunction(supabase, "update_encumbrance", {
        encumbrance_id: parsed.data.encumbranceId,
        blocks_activation: parsed.data.blocksActivation,
        status: parsed.data.status,
        note: parsed.data.note,
    })
}
