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
  // Empty counts as not given; lowercase input such as ga-123-4567 is accepted
  digital_address: z.union([
    z.literal("").transform(() => undefined),
    z.string().trim().toUpperCase().regex(/^[A-Z]{2}-\d{3}-\d{4}$/, "Digital address must be in the format XX-000-0000"),
  ]).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  municipality: z.string().trim().min(1, "Municipality is required"),
  region: regionSchema,
  landmark: z.string().trim().optional(),
})

export type Location = z.infer<typeof locationSchema>

// A draft is saved while the user is still filling in the form, so every field is optional and required text may be empty.
// The full rules are checked by `detailsSchema` and `locationSchema` when the user continues.
export const detailsDraftSchema = detailsSchema
  .extend({ name: z.string().trim() })
  .partial()
  .strict()

export type DetailsDraft = z.infer<typeof detailsDraftSchema>

export const locationDraftSchema = locationSchema
  // Drafts are saved as the user types, so the digital address isn't format-checked until they continue
  .extend({ city: z.string().trim(), municipality: z.string().trim(), digital_address: z.string().trim() })
  .partial()
  .strict()

export type LocationDraft = z.infer<typeof locationDraftSchema>

export const coordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

export type Coordinate = z.infer<typeof coordinateSchema>

export const boundarySchema = z.object({
  pin: coordinateSchema,
  polygon: z.array(coordinateSchema),
})

export type Boundary = z.infer<typeof boundarySchema>

export const boundaryDraftSchema = boundarySchema.partial().strict()

export type BoundaryDraft = z.infer<typeof boundaryDraftSchema>

// The body sent when saving a draft. The draft's id goes in the URL, not here.
export const draftSchema = z.strictObject({
  details: detailsDraftSchema,
  location: locationDraftSchema,
  boundary: boundaryDraftSchema,
})

export type Draft = z.infer<typeof draftSchema>

export const propertyIdSchema = z.uuid()

// A draft as stored on the server, returned after each save and used to resume registration
export const savedDraftSchema = draftSchema.extend({
  id: propertyIdSchema,
  updatedAt: z.string(),
})

export type SavedDraft = z.infer<typeof savedDraftSchema>
