import { z } from "zod"

import { isSimplePolygon } from "@/lib/geo"
import { ACCEPTED_DOCUMENTS, DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/storage/property-documents"
import { phoneNumberSchema } from "@/lib/validators/onboarding"

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

export const coordinateSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export type Coordinate = z.infer<typeof coordinateSchema>

// The corners of a boundary in the order they were drawn, without repeating the first corner at the end
export const polygonSchema = z
  .array(coordinateSchema)
  .min(3, "A boundary needs at least three corners")
  .max(1000, "A boundary can have at most 1,000 corners")
  // Matches the check PostGIS makes when the boundary is saved
  .refine(isSimplePolygon, "The boundary can't cross over itself")

// Where a boundary came from: drawn on the map, or uploaded as a GeoJSON file. Editing an uploaded boundary on the map makes it drawn.
export const boundarySourceSchema = z.enum(["manual_draw", "geojson_import"])

export type BoundarySource = z.infer<typeof boundarySourceSchema>

// A property is marked on the map by drawing its boundary or, when the boundary isn't known, by dropping a pin on it
export const boundarySchema = z.union([
  z.strictObject({ polygon: polygonSchema, source: boundarySourceSchema }),
  z.strictObject({ pin: coordinateSchema, source: boundarySourceSchema }),
])

export type Boundary = z.infer<typeof boundarySchema>

// A boundary is only saved once the user finishes drawing it, so a draft holds a whole boundary or pin.
// null means nothing is marked yet, or the user cleared the map.
export const boundaryDraftSchema = boundarySchema.nullable()

export type BoundaryDraft = z.infer<typeof boundaryDraftSchema>

export const acquisitionMethodSchema = z.enum(
  ["direct_purchase", "purchase_from_owner", "transfer_assignment", "lease_sublease", "inheritance", "other", "unsure"],
  { error: "Choose how you got the property" }
)

export type AcquisitionMethod = z.infer<typeof acquisitionMethodSchema>

// A document uploaded with an answer. The file is in the private property-documents bucket at `path`, which is kept
// rather than a link because links to private files expire; the server makes a fresh one when the file is opened.
export const documentReferenceSchema = z.strictObject({
  id: z.uuid(),
  path: z.string().min(1),
  file_name: z.string().min(1),
})

export type DocumentReference = z.infer<typeof documentReferenceSchema>

// The person who sold or transferred the property, so a reviewer can contact them
export const transferredBySchema = z.strictObject({
  name: z.string().trim().min(1, "Enter the name of the person who transferred it"),
  phone: phoneNumberSchema,
})

const DOCUMENT_NEEDED = "Upload the document, or choose No if you don't have it"

// The answer saved as acquisition_method and acquisition_metadata; the questions asked depend on the method.
// The full rules are checked when the user continues.
export const acquisitionSchema = z.discriminatedUnion("method", [
  z.strictObject({
    method: z.literal("direct_purchase"),
    metadata: z.strictObject({ document: documentReferenceSchema.optional() }),
  }),
  z.strictObject({
    method: z.literal("purchase_from_owner"),
    metadata: z
      .strictObject({
        transferred_by: transferredBySchema,
        has_document: z.boolean({ error: "Say whether you have the document showing the transfer" }),
        document: documentReferenceSchema.optional(),
      })
      .refine((metadata) => !metadata.has_document || metadata.document, { message: DOCUMENT_NEEDED, path: ["document"] }),
  }),
  z.strictObject({
    method: z.literal("transfer_assignment"),
    metadata: z.strictObject({ document: documentReferenceSchema.optional() }),
  }),
  z.strictObject({
    method: z.literal("lease_sublease"),
    metadata: z.strictObject({
      lease_years: z
        .number({ error: "Enter how many years the lease is for" })
        .int("Enter a whole number of years")
        .min(1, "Enter how many years the lease is for")
        .max(999, "Enter a lease of 999 years or less"),
    }),
  }),
  z.strictObject({
    method: z.literal("inheritance"),
    metadata: z
      .strictObject({
        has_document: z.boolean({ error: "Say whether you have documents supporting the inheritance" }),
        document: documentReferenceSchema.optional(),
      })
      .refine((metadata) => !metadata.has_document || metadata.document, { message: DOCUMENT_NEEDED, path: ["document"] }),
  }),
  z.strictObject({
    method: z.literal("other"),
    metadata: z.strictObject({ note: z.string().trim().min(1, "Tell us how you got the property") }),
  }),
  // A reviewer works out the method later
  z.strictObject({ method: z.literal("unsure"), metadata: z.strictObject({}) }),
])

export type Acquisition = z.infer<typeof acquisitionSchema>

// While the user is answering, any follow-up may be missing and text may be empty or half typed.
// null means no method has been chosen yet.
export const acquisitionDraftSchema = z
  .discriminatedUnion("method", [
    z.strictObject({
      method: z.literal("direct_purchase"),
      metadata: z.strictObject({ document: documentReferenceSchema.optional() }),
    }),
    z.strictObject({
      method: z.literal("purchase_from_owner"),
      metadata: z
        .strictObject({
          transferred_by: z.strictObject({ name: z.string().trim(), phone: z.string().trim() }).partial(),
          has_document: z.boolean(),
          document: documentReferenceSchema,
        })
        .partial(),
    }),
    z.strictObject({
      method: z.literal("transfer_assignment"),
      metadata: z.strictObject({ document: documentReferenceSchema.optional() }),
    }),
    z.strictObject({
      method: z.literal("lease_sublease"),
      metadata: z.strictObject({ lease_years: z.number().int().min(0).max(999) }).partial(),
    }),
    z.strictObject({
      method: z.literal("inheritance"),
      metadata: z.strictObject({ has_document: z.boolean(), document: documentReferenceSchema }).partial(),
    }),
    z.strictObject({
      method: z.literal("other"),
      metadata: z.strictObject({ note: z.string().trim() }).partial(),
    }),
    z.strictObject({ method: z.literal("unsure"), metadata: z.strictObject({}) }),
  ])
  .nullable()

export type AcquisitionDraft = z.infer<typeof acquisitionDraftSchema>

// The three things the documents screen asks for. A slot only hints at what a document is: users can put a document in
// the wrong one, and a reviewer sets its type whichever slot it is in.
export const documentSlotSchema = z.enum(["ownership", "site_plan", "supporting"])

export type DocumentSlot = z.infer<typeof documentSlotSchema>

// What a user may say a document is. A reviewer sets the final type, which may also be 'other'.
// Keep in step with property_documents_declared_type_check in the migrations.
export const propertyDocumentTypeSchema = z.enum([
  "land_title_certificate",
  "indenture",
  "deed_of_conveyance",
  "deed_of_assignment",
  "lease_agreement",
  "sublease_agreement",
  "sale_and_purchase_agreement",
  "allocation_letter",
  "site_plan",
  "cadastral_plan",
  "previous_owner_acquisition_document",
  "consent_to_assign",
  "head_lease",
  "grant_of_probate",
  "letters_of_administration",
  "will",
  "power_of_attorney",
  "official_land_search_report",
  "ground_rent_receipts",
  "property_rate_receipts",
  "utility_bills",
  "subdivision_approval",
  "court_order",
  "grantor_authority_documents",
])

export type PropertyDocumentType = z.infer<typeof propertyDocumentTypeSchema>

// The body sent to record a document before its file is uploaded
export const documentUploadSchema = z.strictObject({
  slot: documentSlotSchema,
  file_name: z.string().trim().min(1, "The file needs a name").max(255, "The file name is too long"),
  file_size_bytes: z.number().int().positive("The file is empty").max(MAX_DOCUMENT_BYTES, "The file is larger than 20 MB"),
  mime_type: z.enum(DOCUMENT_MIME_TYPES, { error: `Upload ${ACCEPTED_DOCUMENTS}` }),
})

export type DocumentUpload = z.infer<typeof documentUploadSchema>

// The body sent when the user says what a document is; null means they don't know
export const declaredTypeUpdateSchema = z.strictObject({
  declared_type: propertyDocumentTypeSchema.nullable(),
})

// A document uploaded to a draft, as listed on the documents screen
export const draftDocumentSchema = documentReferenceSchema.extend({
  slot: documentSlotSchema,
  declared_type: propertyDocumentTypeSchema.nullable(),
  file_size_bytes: z.number(),
  mime_type: z.string(),
  created_at: z.string(),
})

export type DraftDocument = z.infer<typeof draftDocumentSchema>

// The body sent when saving a draft. The draft's id goes in the URL, not here.
export const draftSchema = z.strictObject({
  details: detailsDraftSchema,
  location: locationDraftSchema,
  // Left out, the saved boundary is kept
  boundary: boundaryDraftSchema.optional(),
  // Left out, the saved answer is kept
  acquisition: acquisitionDraftSchema.optional(),
})

export type Draft = z.infer<typeof draftSchema>

export const propertyIdSchema = z.uuid()

// What the user confirms before submitting. The server records this wording, not what the browser sends, as what they agreed to.
export const SUBMISSION_DECLARATION = "I confirm that the information I have provided is accurate to the best of my knowledge."

// The body sent to submit a draft
export const submitSchema = z.strictObject({
  confirmed: z.literal(true, { error: "Confirm that your information is accurate before submitting." }),
})

// A draft as stored on the server, returned after each save and used to resume registration
export const savedDraftSchema = draftSchema.extend({
  id: propertyIdSchema,
  updatedAt: z.string(),
})

export type SavedDraft = z.infer<typeof savedDraftSchema>
