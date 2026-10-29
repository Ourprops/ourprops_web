import { NextRequest } from "next/server"

import { InvalidDraftError, submitDraft } from "@/lib/supabase/property-drafts"
import { submitSchema } from "@/lib/validators/property"

import { errorResponse, readRequest } from "../../request"

// Sends the draft for review once the user confirms their answers are accurate.
// Anything still missing, such as the boundary or documents, is followed up by a reviewer.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
    const result = await readRequest(request, submitSchema)
    if (!result.ok) return result.response

    const { id } = await params

    try {
        const submitted = await submitDraft(result.supabase, id)
        if (!submitted) return errorResponse("Draft not found.", 404)
        return Response.json(submitted)
    } catch (error) {
        if (error instanceof InvalidDraftError) return errorResponse(error.message, 400)
        console.error("Error submitting a property:", error)
        return errorResponse("Unable to submit your property right now.", 500)
    }
}
