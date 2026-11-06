// What a server action gives back to its form: null when it went through, or a message to show the admin
export type ActionState = { error: string } | null

// The database functions raise these with messages written for the person acting (supabase/migrations, start_review onwards)
const SHOWABLE_CODES = new Set([
    "23514", // the property or checkpoint isn't in a state that allows this
    "P0002", // the property or checkpoint doesn't exist
])

export const GENERIC_ACTION_ERROR = "Something went wrong. Reload the page and try again."

/**
 * The message to show for an error from a review function. Only the codes the functions raise on purpose are shown
 * as they are; anything else, including 42501 (requireAdmin() has already passed, so it means the session changed
 * underneath us), gets a generic message so database internals never reach the page.
 */
export function actionErrorMessage(error: { code?: string; message: string }): string {
    return error.code && SHOWABLE_CODES.has(error.code) ? error.message : GENERIC_ACTION_ERROR
}
