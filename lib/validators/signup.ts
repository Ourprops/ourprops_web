import { z } from "zod"

// One password rule for signing up and for setting a new password, so they can't drift apart
export const passwordSchema = z
  .string()
  .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, "Weak password. Use at least 8 characters with letters and numbers.")

// Trimmed and lower-cased before it's checked: phone keyboards often add a space after an autocompleted email, and
// z.email().trim() would check first and refuse it
const emailSchema = (message: string) => z.string().trim().toLowerCase().pipe(z.email(message))

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: emailSchema("Invalid email address."),
  password: passwordSchema,
})

export type SignUpInput = z.infer<typeof signUpSchema>

// "Forgot password?": just the email
export const forgotPasswordSchema = z.object({
  email: emailSchema("Enter the email you signed up with."),
})

// "Set a new password": typed twice, so a typo doesn't lock them out again
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  })
