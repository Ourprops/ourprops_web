import type { NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { draftSchema } from "@/lib/validators/property"

export function errorResponse(message: string, status: number) {
    return Response.json({ error: { message } }, { status })
}

// Checks the user is signed in and the body is a valid draft, shared by creating and updating drafts
export async function readDraftRequest(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { ok: false, response: errorResponse("Sign in to save your draft.", 401) } as const
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return { ok: false, response: errorResponse("Invalid request body.", 400) } as const
    }

    const parsed = draftSchema.safeParse(body)
    if (!parsed.success) {
        return { ok: false, response: errorResponse(parsed.error.issues[0]?.message ?? "Invalid draft.", 400) } as const
    }

    return { ok: true, supabase, user, draft: parsed.data } as const
}
