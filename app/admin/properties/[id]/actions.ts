"use server"

import { refresh } from "next/cache"

import { actionErrorMessage, type ActionState } from "@/lib/admin/errors"
import { requireAdmin } from "@/lib/auth/staff"
import { checkpointUpdateSchema } from "@/lib/validators/admin"
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

// Sets one checkpoint's status and notes on a property in review. The page binds propertyId and checkpointKey;
// the form sends status, public_note (the owner sees it) and internal_note (they never do).
export async function updateCheckpoint(
    propertyId: string,
    checkpointKey: string,
    _previous: ActionState,
    formData: FormData
): Promise<ActionState> {
    const { supabase } = await requireAdmin()

    const parsed = checkpointUpdateSchema.safeParse({
        propertyId,
        checkpointKey,
        status: formData.get("status"),
        // An empty note clears it: update_checkpoint stores blank notes as null
        publicNote: formData.get("public_note") ?? "",
        internalNote: formData.get("internal_note") ?? "",
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const update = parsed.data
    const { error } = await supabase.rpc("update_checkpoint", {
        property_id: update.propertyId,
        checkpoint_key: update.checkpointKey,
        status: update.status,
        public_note: update.publicNote,
        internal_note: update.internalNote,
    })
    if (error) {
        console.error("update_checkpoint failed", error)
        return { error: actionErrorMessage(error) }
    }

    // Shows the new status, who verified it, and the entry in History
    refresh()
    return null
}
