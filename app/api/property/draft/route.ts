import { NextRequest } from "next/server"

import { createDraft } from "@/lib/supabase/property-drafts"

import { errorResponse, readDraftRequest } from "./request"

// Creates a draft from the first save; later saves update it through /api/property/draft/[id]
export async function POST(request: NextRequest) {
    const result = await readDraftRequest(request)
    if ("response" in result) return result.response

    try {
        const saved = await createDraft(result.supabase, result.user.id, result.draft)
        return Response.json(saved, { status: 201 })
    } catch (error) {
        console.error("Error creating property draft:", error)
        return errorResponse("Unable to save your draft right now.", 500)
    }
}
