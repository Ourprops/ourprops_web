"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"

import { GENERIC_ACTION_ERROR } from "@/lib/action-errors"
import { createClient } from "@/lib/supabase/server"
import { ownDetailsSchema } from "@/lib/validators/details"

export type DetailsState = { error: string } | { saved: true } | null

// Saves the owner's name and phone number, as themselves; the profiles policy limits it to their own row
export async function saveOwnDetails(_previous: DetailsState, formData: FormData): Promise<DetailsState> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub
    if (!userId) redirect("/account/login")

    const parsed = ownDetailsSchema.safeParse({ fullName: formData.get("full_name") ?? "", phoneNumber: formData.get("phone_number") ?? "" })
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { error } = await supabase
        .from("profiles")
        .update({ full_name: parsed.data.fullName, phone_number: parsed.data.phoneNumber })
        .eq("id", userId)
    if (error) {
        console.error("Saving own details failed", { code: error.code, message: error.message })
        return { error: GENERIC_ACTION_ERROR }
    }

    refresh()
    return { saved: true }
}
