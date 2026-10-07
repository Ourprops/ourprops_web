import { z } from "zod"

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.email("Invalid email address.").trim().toLowerCase(),
  password: z
    .string()
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
      "Weak password. Use at least 8 characters with letters and numbers."
    ),
})

export type SignUpInput = z.infer<typeof signUpSchema>
