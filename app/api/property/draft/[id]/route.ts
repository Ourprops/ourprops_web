import { NextRequest } from "next/server"

import { updateDraft } from "@/lib/supabase/property-drafts"

import { errorResponse, readDraftRequest } from "../request"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const result = await readDraftRequest(request)
    if ("response" in result) return result.response

    const { id } = await params

    try {
        const saved = await updateDraft(result.supabase, id, result.draft)
        if (!saved) return errorResponse("Draft not found.", 404)
        return Response.json(saved)
    } catch (error) {
        console.error("Error updating property draft:", error)
        return errorResponse("Unable to save your draft right now.", 500)
    }
}
