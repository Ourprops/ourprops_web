import { NextRequest } from "next/server"

import { createDocument } from "@/lib/supabase/property-documents"
import { documentUploadSchema } from "@/lib/validators/property"

import { errorResponse, readRequest } from "../../request"

// Records a document on the draft and returns the path to upload its file to, straight from the browser
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
    const result = await readRequest(request, documentUploadSchema)
    if (!result.ok) return result.response

    const { id } = await params

    try {
        const document = await createDocument(result.supabase, result.user.id, id, result.body)
        if (!document) return errorResponse("Draft not found.", 404)
        return Response.json(document, { status: 201 })
    } catch (error) {
        console.error("Error recording a property document:", error)
        return errorResponse("Unable to upload your document right now.", 500)
    }
}
