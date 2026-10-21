import { NextRequest } from "next/server"

import { deleteDocument, setDeclaredType } from "@/lib/supabase/property-documents"
import { declaredTypeUpdateSchema } from "@/lib/validators/property"

import { errorResponse, readRequest, readUser } from "../../../request"

type Params = { params: Promise<{ id: string; documentId: string }> }

// Records what the user says the document is, or that they don't know
export async function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
    const result = await readRequest(request, declaredTypeUpdateSchema)
    if (!result.ok) return result.response

    const { id, documentId } = await params

    try {
        const document = await setDeclaredType(result.supabase, id, documentId, result.body.declared_type)
        if (!document) return errorResponse("Document not found.", 404)
        return Response.json(document)
    } catch (error) {
        console.error("Error updating a property document:", error)
        return errorResponse("Unable to update your document right now.", 500)
    }
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
    const result = await readUser()
    if (!result.ok) return result.response

    const { id, documentId } = await params

    try {
        const deleted = await deleteDocument(result.supabase, id, documentId)
        if (!deleted) return errorResponse("Document not found.", 404)
        return new Response(null, { status: 204 })
    } catch (error) {
        console.error("Error removing a property document:", error)
        return errorResponse("Unable to remove your document right now.", 500)
    }
}
