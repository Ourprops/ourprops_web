import { z } from "zod"

import { phoneNumberSchema } from "@/lib/validators/onboarding"

// What an owner can change about themselves. The name is the one their identity document is checked against.
export const ownDetailsSchema = z.object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120, "Keep your name to 120 characters or fewer."),
    phoneNumber: phoneNumberSchema,
})
