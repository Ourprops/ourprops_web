import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { waitlistSignupSchema } from "@/lib/validators/waitlist"

export async function POST(request: Request) {
    console.log("Received waitlist submission request")
    try {
        const json = await request.json()
        const parsed = waitlistSignupSchema.safeParse(json)

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid waitlist payload",
                    fieldErrors: parsed.error.flatten().fieldErrors,
                },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { error } = await supabase
            .from("waitlist")
            .insert({
                email: parsed.data.email,
                role: parsed.data.role,
            })

        if (error) {
            console.error("Error inserting waitlist submission:", error)
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "This email is already on the waitlist." },
                    { status: 409 }
                )
            }

            return NextResponse.json(
                { error: "Unable to save your waitlist submission right now." },
                { status: 500 }
            )
        }

        return NextResponse.json({ ok: true }, { status: 201 })
    } catch(error) {
        console.error("Error processing waitlist submission:", error)
        return NextResponse.json(
            { error: "Unexpected error while processing request." },
            { status: 500 }
        )
    }
}