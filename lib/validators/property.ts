import { z } from "zod"

export const propertyTypeSchema = z.enum(
  ["residential", "commercial", "industrial", "land", "mixed-use", "other"],
  { error: "Choose a property type" }
)

export type PropertyType = z.infer<typeof propertyTypeSchema>

export const regionSchema = z.enum([
  "Greater Accra",
  "Ashanti",
  "Eastern",
  "Western",
  "Central",
  "Northern",
  "Upper East",
  "Upper West",
  "Volta",
  "Bono",
  "Bono East",
  "Ahafo",
  "North East",
  "Oti",
  "Savannah",
  "Western North",
])

export type Region = z.infer<typeof regionSchema>

export const detailsSchema = z.object({
  name: z.string().trim().min(1, "Property name is required"),
  type: propertyTypeSchema,
  description: z.string().trim().optional(),
})

export type Details = z.infer<typeof detailsSchema>

export const locationSchema = z.object({
  address: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  municipality: z.string().trim().min(1, "Municipality is required"),
  region: regionSchema,
})

export type Location = z.infer<typeof locationSchema>

// A draft is saved while the user is still filling in the form, so every field is optional and the name may be empty.
// The full rules are checked by `detailsSchema` when the user continues.
export const detailsDraftSchema = detailsSchema
  .extend({ name: z.string().trim() })
  .partial()
  .strict()

export type DetailsDraft = z.infer<typeof detailsDraftSchema>

export const draftSchema = z.strictObject({
  propertyId: z.string().optional(),
  details: detailsDraftSchema,
})

export type Draft = z.infer<typeof draftSchema>
