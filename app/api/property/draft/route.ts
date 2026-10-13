import { NextRequest } from "next/server"

import { draftSchema } from "@/lib/validators/property"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest) {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: { message: "Invalid request body." } }, { status: 400 })
    }

    const parsed = draftSchema.safeParse(body)
    if (!parsed.success) {
        return Response.json(
            { error: { message: parsed.error.issues[0]?.message ?? "Invalid draft." } },
            { status: 400 }
        )
    }

    try {
        const supabase = await createClient()
        const {data: property, error: propertyError} = await supabase.from("property")
            .upsert({
                
            })
    } catch (error) {
        
    }


    return Response.json({ ok: true })
}
