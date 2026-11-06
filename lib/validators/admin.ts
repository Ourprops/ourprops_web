import { z } from "zod"

// Only the shape of each review action. The rules (what can be waived, when a note is needed, what blocks
// approval) are the database functions', so they live in one place and their messages reach the admin as they are.

// The seven checkpoints start_review creates (property_checkpoints_checkpoint_key_check)
export const CHECKPOINT_KEYS = [
  "identity_verified",
  "ownership_claim_verified",
  "boundary_mapped",
  "cadastral_cross_check",
  "overlap_clearance",
  "official_search_status",
  "encumbrance_clearance",
] as const

// What update_checkpoint lets an admin set; 'submitted' is for evidence an owner has sent
export const ADMIN_CHECKPOINT_STATUSES = ["unverified", "in_progress", "verified", "flagged", "waived"] as const

// update_checkpoint refuses to waive these; the console just doesn't offer it
export const UNWAIVABLE_CHECKPOINTS: readonly string[] = ["identity_verified", "ownership_claim_verified"]

export const OWNERSHIP_TYPES = ["customary_family", "stool_sublease", "state_lease", "private_freehold"] as const
export const OWNERSHIP_STRUCTURES = ["sole", "co_owned", "company"] as const

// What review_document lets an admin set; 'unreviewed' is where every upload starts
export const DOCUMENT_OUTCOMES = ["accepted", "rejected", "superseded"] as const

// What resolve_overlap accepts; flags start as 'detected' and nothing sends them back
export const OVERLAP_OUTCOMES = ["investigating", "resolved_valid", "resolved_false_positive"] as const

export const ENCUMBRANCE_KINDS = ["mortgage", "caveat", "litigation", "lease", "other"] as const

// The checklist items an owner uploads into (property_documents_slot_check)
export const DOCUMENT_SLOTS = ["ownership", "site_plan", "supporting"] as const

// The database has no limit on notes; this keeps one form post from storing a novel in the row and the audit log
export const MAX_NOTE_LENGTH = 2000

// property_encumbrances_reference_check
export const MAX_ENCUMBRANCE_REFERENCE_LENGTH = 200

const noteSchema = z
  .string({ error: "Enter the note as text" })
  .max(MAX_NOTE_LENGTH, `Keep notes to ${MAX_NOTE_LENGTH.toLocaleString("en-GB")} characters or fewer`)

// The ids are bound by the page, but bound values pass through the browser
const propertyId = z.uuid({ error: "Property not found." })

// A radio group sends nothing when no option is chosen, and "yes" or "no" when one is
const yesNo = (message: string) => z.enum(["yes", "no"], { error: message }).transform((value) => value === "yes")

export const checkpointUpdateSchema = z.object({
  propertyId: z.uuid({ error: "Checkpoint not found." }),
  checkpointKey: z.enum(CHECKPOINT_KEYS, { error: "Checkpoint not found." }),
  status: z.enum(ADMIN_CHECKPOINT_STATUSES, { error: "Choose a status" }),
  publicNote: noteSchema,
  internalNote: noteSchema,
})

export const classificationSchema = z.object({
  propertyId,
  ownershipType: z.enum(OWNERSHIP_TYPES, { error: "Choose an ownership type" }),
  ownershipStructure: z.enum(OWNERSHIP_STRUCTURES, { error: "Choose an ownership structure" }),
})

export const documentReviewSchema = z.object({
  documentId: z.uuid({ error: "Document not found." }),
  // Empty keeps the type already set; review_document checks it against its list
  documentType: z.string({ error: "Choose a document type" }).transform((value) => value || null),
  status: z.enum(DOCUMENT_OUTCOMES, { error: "Choose accepted, rejected or superseded" }),
  note: noteSchema,
})

export const overlapResolutionSchema = z.object({
  flagId: z.uuid({ error: "Overlap not found." }),
  status: z.enum(OVERLAP_OUTCOMES, { error: "Choose what you found" }),
  note: noteSchema,
})

export const suspensionSchema = z.object({
  propertyId,
  reason: noteSchema,
})

export const reopenSchema = z.object({
  propertyId,
  note: noteSchema,
  checkpoints: z.array(z.enum(CHECKPOINT_KEYS, { error: "Choose checkpoints from the list" })),
})

export const encumbranceRecordSchema = z.object({
  propertyId,
  kind: z.enum(ENCUMBRANCE_KINDS, { error: "Choose what kind of encumbrance it is" }),
  reference: z
    .string({ error: "Enter the reference" })
    .trim()
    .min(1, "Enter the suit number or registry reference")
    .max(MAX_ENCUMBRANCE_REFERENCE_LENGTH, `Keep the reference to ${MAX_ENCUMBRANCE_REFERENCE_LENGTH} characters or fewer`),
  blocksActivation: yesNo("Say whether it blocks activation"),
  note: noteSchema,
})

// The owner sees the message and every note. A request asks for documents, the owner's identity document, or both.
export const changeRequestSchema = z
  .object({
    propertyId,
    message: noteSchema.trim().min(1, "Write the message the owner will see"),
    documents: z.array(
      z.object({
        slot: z.enum(DOCUMENT_SLOTS, { error: "Choose checklist items from the list" }),
        note: noteSchema.trim().min(1, "Say what to send for each item you ask for"),
      })
    ),
    identity: z.boolean(),
  })
  .refine((request) => request.documents.length > 0 || request.identity, {
    error: "Ask for at least one document, or for the owner's identity document",
  })

// release_identity_document needs a reason, which goes in the audit log and the reopened properties' history
export const identityReleaseSchema = z.object({
  profileId: z.uuid({ error: "Identity document not found." }),
  reason: noteSchema.trim().min(1, "Say why the document is released, for example how the owner proved it is theirs"),
})

// What review_identity_document lets an admin set; 'unreviewed' is where every document starts
export const IDENTITY_OUTCOMES = ["verified", "rejected"] as const

// The owner sees the note; review_identity_document requires one for a rejection
export const identityReviewSchema = z.object({
  profileId: z.uuid({ error: "Identity document not found." }),
  status: z.enum(IDENTITY_OUTCOMES, { error: "Choose verified or rejected" }),
  note: noteSchema,
})

export const encumbranceUpdateSchema = z.object({
  encumbranceId: z.uuid({ error: "Encumbrance not found." }),
  blocksActivation: yesNo("Say whether it blocks activation"),
  status: z.enum(["open", "resolved"], { error: "Choose open or resolved" }),
  note: noteSchema,
})
