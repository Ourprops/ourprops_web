import { NextRequest } from "next/server"

import { deleteDraft, updateDraft, InvalidDraftError } from "@/lib/supabase/property-drafts"

import { errorResponse, readDraftRequest, readUser } from "../request"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
    const result = await readDraftRequest(request)
    if (!result.ok) return result.response

    const { id } = await params

    try {
        const saved = await updateDraft(result.supabase, id, result.draft)
        if (!saved) return errorResponse("Draft not found.", 404)
        return Response.json(saved)
    } catch (error) {
        if (error instanceof InvalidDraftError) return errorResponse(error.message, 400)
        console.error("Error updating property draft:", error)
        return errorResponse("Unable to save your draft right now.", 500)
    }
}

// Deletes a draft and its files. A submitted property can't be deleted this way.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
    const result = await readUser()
    if (!result.ok) return result.response

    const { id } = await params

    try {
        const deleted = await deleteDraft(result.supabase, id)
        if (!deleted) return errorResponse("Draft not found.", 404)
        return new Response(null, { status: 204 })
    } catch (error) {
        console.error("Error deleting property draft:", error)
        return errorResponse("Unable to delete your draft right now.", 500)
    }
}
