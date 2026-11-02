import { z } from "zod"

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

// The database has no limit on notes; this keeps one form post from storing a novel in the row and the audit log
export const MAX_CHECKPOINT_NOTE_LENGTH = 2000

const noteSchema = z
  .string({ error: "Enter the note as text" })
  .max(MAX_CHECKPOINT_NOTE_LENGTH, `Keep notes to ${MAX_CHECKPOINT_NOTE_LENGTH.toLocaleString("en-GB")} characters or fewer`)

// Only the shape of the update. The rules (what can be waived, when a public note is needed, identity first)
// are update_checkpoint's, so they live in one place and its messages reach the admin as they are.
export const checkpointUpdateSchema = z.object({
  propertyId: z.uuid({ error: "Checkpoint not found." }),
  checkpointKey: z.enum(CHECKPOINT_KEYS, { error: "Checkpoint not found." }),
  status: z.enum(ADMIN_CHECKPOINT_STATUSES, { error: "Choose a status" }),
  publicNote: noteSchema,
  internalNote: noteSchema,
})
