"use server"

import { refresh } from "next/cache"

import { actionErrorMessage, type ActionState } from "@/lib/admin/errors"
import { requireAdmin } from "@/lib/auth/staff"
import { propertyIdSchema } from "@/lib/validators/property"

// Every action here is a public POST endpoint, whatever page shows its button, so each one checks the caller
// itself. requireAdmin() redirects or 404s by throwing, which is why nothing below wraps it in try/catch.

// Takes a submitted property into review (docs/admin.md, section 5). The page binds propertyId, but bound values
// make a round trip through the browser, so it is checked again here; start_review decides everything else.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState passes the previous state first
export async function startReview(propertyId: string, _previous: ActionState): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    if (!propertyIdSchema.safeParse(propertyId).success) {
        return { error: "Property not found." }
    }

    const { error } = await supabase.rpc("start_review", { property_id: propertyId })
    if (error) {
        console.error("start_review failed", error)
        return { error: actionErrorMessage(error) }
    }

    // Shows the new status and the seven checkpoints it created
    refresh()
    return null
}
