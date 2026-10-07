import { z } from "zod"

// Roles a user may pick for themselves. 'partner_verifier' and 'admin' are assigned internally.
export const ONBOARDING_ROLES = ["owner", "developer"] as const

export const ONBOARDING_ROLE_LABELS: Record<(typeof ONBOARDING_ROLES)[number], string> = {
  owner: "Property owner",
  developer: "Developer",
}

export const onboardingSchema = z.object({
  role: z.enum(ONBOARDING_ROLES, "Select a role."),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid phone number."),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
