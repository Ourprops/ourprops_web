import type { NextRequest } from "next/server"
import type { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { draftSchema } from "@/lib/validators/property"

export function errorResponse(message: string, status: number) {
    return Response.json({ error: { message } }, { status })
}

// Checks the user is signed in, shared by every draft route
export async function readUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { ok: false, response: errorResponse("Sign in to save your draft.", 401) } as const
    }
    return { ok: true, supabase, user } as const
}

// Checks the user is signed in and the body matches `schema`
export async function readRequest<Schema extends z.ZodType>(request: NextRequest, schema: Schema) {
    const result = await readUser()
    if (!result.ok) return result

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return { ok: false, response: errorResponse("Invalid request body.", 400) } as const
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
        return { ok: false, response: errorResponse(parsed.error.issues[0]?.message ?? "Invalid request.", 400) } as const
    }

    return { ...result, body: parsed.data as z.infer<Schema> } as const
}

// Checks the user is signed in and the body is a valid draft, shared by creating and updating drafts
export async function readDraftRequest(request: NextRequest) {
    const result = await readRequest(request, draftSchema)
    if (!result.ok) return result
    return { ...result, draft: result.body } as const
}
