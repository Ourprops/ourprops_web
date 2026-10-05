import { z } from "zod"

export const WAITLIST_ROLES = [
  "Property Owner",
  "Seeker (Buyer/Family)",
  "Agent / Real Estate Professional",
  "Other",
] as const

export const waitlistSignupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  role: z.enum(WAITLIST_ROLES),
})

export type WaitlistSignupInput = z.infer<typeof waitlistSignupSchema>
