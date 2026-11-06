"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { actionErrorMessage, type ActionState } from "@/lib/action-errors"
import { createClient } from "@/lib/supabase/server"
import { propertyIdSchema } from "@/lib/validators/property"

// A public POST endpoint like any server action, so it checks the caller itself. resubmit_property checks the
// property is the caller's, waiting on them, and has every requested document in storage.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState passes the previous state first
export async function resubmitProperty(propertyId: string, _previous: ActionState): Promise<ActionState> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims?.sub) {
        redirect("/account/login")
    }

    if (!propertyIdSchema.safeParse(propertyId).success) {
        return { error: "Property not found." }
    }

    const { error } = await supabase.rpc("resubmit_property", { property_id: propertyId })
    if (error) {
        console.error("resubmit_property failed", error)
        return { error: actionErrorMessage(error) }
    }

    refresh()
    return null
}
