import { NextRequest } from "next/server"

import { deleteDocument } from "@/lib/supabase/property-documents"

import { errorResponse, readUser } from "../../../request"

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; documentId: string }> },
): Promise<Response> {
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
